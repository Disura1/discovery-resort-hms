import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export interface GuestAccessTokenPayload {
  sub: string; // guest id
  type: "guest";
}

export function signGuestAccessToken(guestId: string): string {
  const payload: GuestAccessTokenPayload = { sub: guestId, type: "guest" };
  return jwt.sign(payload, env.JWT_GUEST_ACCESS_SECRET, { expiresIn: env.GUEST_ACCESS_TOKEN_TTL as any });
}

export function verifyGuestAccessToken(token: string): GuestAccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_GUEST_ACCESS_SECRET) as GuestAccessTokenPayload;
  if (decoded.type !== "guest") {
    throw new Error("Not a guest token");
  }
  return decoded;
}

export function generateGuestRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function hashGuestRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
