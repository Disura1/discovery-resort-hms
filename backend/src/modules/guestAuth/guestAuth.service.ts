import crypto from "crypto";
import { guestAuthRepository } from "./guestAuth.repository";
import { guestsRepository } from "../guests/guests.repository";
import { signGuestAccessToken, generateGuestRefreshToken, hashGuestRefreshToken } from "../../utils/guestJwt";
import { sendMail } from "../../utils/mailer";
import { AppError } from "../../utils/AppError";
import { env } from "../../config/env";

function generateOtp(): string {
  // A cryptographically random 6-digit code, not Math.random().
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export const guestAuthService = {
  async requestOtp(email: string) {
    const allowed = await guestAuthRepository.canRequestOtp(email);
    if (!allowed) {
      throw AppError.tooManyRequests("Please wait a minute before requesting another code.");
    }

    const code = generateOtp();
    await guestAuthRepository.storeOtp(email, code);

    await sendMail(
      email,
      "Your Grand Lotus Hotel login code",
      `Your login code is ${code}. It expires in ${env.GUEST_OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
      `<p>Your login code is <strong style="font-size:20px">${code}</strong>.</p><p>It expires in ${env.GUEST_OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`
    );
  },

  async verifyOtp(email: string, code: string, fullNameIfNew: string | undefined) {
    const result = await guestAuthRepository.verifyOtp(email, code);

    if (result === "EXPIRED") {
      throw AppError.badRequest("This code has expired. Please request a new one.");
    }
    if (result === "LOCKED") {
      throw AppError.tooManyRequests("Too many incorrect attempts. Please request a new code.");
    }
    if (result === "INVALID") {
      throw AppError.badRequest("That code is incorrect. Please check and try again.");
    }

    const guest = await guestsRepository.findOrCreateByEmail(email, fullNameIfNew?.trim() || "Guest");

    const accessToken = signGuestAccessToken(guest.id);
    const { token: refreshToken, hash } = generateGuestRefreshToken();
    const expiresAt = new Date(Date.now() + env.GUEST_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await guestAuthRepository.storeRefreshToken(guest.id, hash, expiresAt);

    return {
      accessToken,
      refreshToken,
      guest: { id: guest.id, fullName: guest.full_name, email: guest.email }
    };
  },

  async refresh(refreshToken: string) {
    const hash = hashGuestRefreshToken(refreshToken);
    const record = await guestAuthRepository.findValidRefreshToken(hash);
    if (!record) throw AppError.unauthorized("Session expired. Please log in again.");

    await guestAuthRepository.revokeRefreshToken(hash);
    const { token: newRefreshToken, hash: newHash } = generateGuestRefreshToken();
    const expiresAt = new Date(Date.now() + env.GUEST_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await guestAuthRepository.storeRefreshToken(record.guest_id, newHash, expiresAt);

    const accessToken = signGuestAccessToken(record.guest_id);
    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string) {
    await guestAuthRepository.revokeRefreshToken(hashGuestRefreshToken(refreshToken));
  }
};
