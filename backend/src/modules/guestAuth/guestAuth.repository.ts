import crypto from "crypto";
import { pool } from "../../config/db";
import { redis } from "../../config/redis";
import { env } from "../../config/env";

const OTP_PREFIX = "guest-otp:";
const OTP_COOLDOWN_PREFIX = "guest-otp-cooldown:";
const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function hashOtp(code: string, email: string): string {
  // Salting with the email prevents a leaked Redis dump from being a
  // reusable rainbow table across every pending OTP in the system.
  return crypto.createHash("sha256").update(`${code}:${email.toLowerCase()}`).digest("hex");
}

export const guestAuthRepository = {
  async canRequestOtp(email: string): Promise<boolean> {
    const key = OTP_COOLDOWN_PREFIX + email.toLowerCase();
    const result = await redis.set(key, "1", "EX", OTP_RESEND_COOLDOWN_SECONDS, "NX");
    return result === "OK";
  },

  async storeOtp(email: string, code: string): Promise<void> {
    const key = OTP_PREFIX + email.toLowerCase();
    const value = JSON.stringify({ hash: hashOtp(code, email), attempts: 0 });
    await redis.set(key, value, "EX", env.GUEST_OTP_TTL_MINUTES * 60);
  },

  async verifyOtp(email: string, code: string): Promise<"OK" | "EXPIRED" | "INVALID" | "LOCKED"> {
    const key = OTP_PREFIX + email.toLowerCase();
    const raw = await redis.get(key);
    if (!raw) return "EXPIRED";

    const record = JSON.parse(raw) as { hash: string; attempts: number };
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await redis.del(key);
      return "LOCKED";
    }

    if (record.hash !== hashOtp(code, email)) {
      record.attempts += 1;
      const ttl = await redis.ttl(key);
      await redis.set(key, JSON.stringify(record), "EX", ttl > 0 ? ttl : 60);
      return "INVALID";
    }

    await redis.del(key);
    return "OK";
  },

  async storeRefreshToken(guestId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `INSERT INTO guest_refresh_tokens (guest_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [guestId, tokenHash, expiresAt]
    );
  },

  async findValidRefreshToken(tokenHash: string): Promise<{ id: string; guest_id: string } | null> {
    const { rows } = await pool.query(
      `SELECT id, guest_id FROM guest_refresh_tokens
       WHERE token_hash = $1 AND revoked = false AND expires_at > now()`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await pool.query(`UPDATE guest_refresh_tokens SET revoked = true WHERE token_hash = $1`, [tokenHash]);
  }
};
