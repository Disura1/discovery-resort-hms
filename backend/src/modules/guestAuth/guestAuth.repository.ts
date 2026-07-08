import { pool } from "../../config/db";

export const guestAuthRepository = {
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