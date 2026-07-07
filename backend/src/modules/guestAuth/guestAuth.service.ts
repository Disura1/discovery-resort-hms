import { guestAuthRepository } from "./guestAuth.repository";
import { guestsRepository } from "../guests/guests.repository";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signGuestAccessToken, generateGuestRefreshToken, hashGuestRefreshToken } from "../../utils/guestJwt";
import { AppError } from "../../utils/AppError";
import { env } from "../../config/env";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function toProfile(guest: { id: string; full_name: string; email: string | null }) {
  return { id: guest.id, fullName: guest.full_name, email: guest.email };
}

export const guestAuthService = {
  async register(fullName: string, email: string, password: string) {
    const existing = await guestsRepository.findByEmail(email);
    if (existing?.password_hash) {
      throw AppError.conflict("An account with this email already exists. Please log in instead.");
    }

    const passwordHash = await hashPassword(password);
    const guest = existing
      ? await guestsRepository.attachPassword(existing.id, passwordHash, fullName)
      : await guestsRepository.create({ fullName, email, passwordHash });

    return this.issueSession(guest);
  },

  async login(email: string, password: string) {
    const guest = await guestsRepository.findByEmail(email);

    // Same generic error whether the account doesn't exist, was never
    // registered with a password, or the password is wrong — avoids
    // leaking which emails have accounts.
    const genericError = () => AppError.unauthorized("Invalid email or password");

    if (!guest || !guest.password_hash) throw genericError();

    if (guest.locked_until && guest.locked_until > new Date()) {
      throw AppError.forbidden("Account temporarily locked due to repeated failed login attempts. Please try again later.");
    }

    const passwordValid = await verifyPassword(password, guest.password_hash);
    if (!passwordValid) {
      const attempts = await guestsRepository.registerFailedLogin(guest.id);
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await guestsRepository.lockAccount(guest.id, until);
      }
      throw genericError();
    }

    await guestsRepository.resetFailedLogins(guest.id);
    return this.issueSession(guest);
  },

  async issueSession(guest: { id: string; full_name: string; email: string | null }) {
    const accessToken = signGuestAccessToken(guest.id);
    const { token: refreshToken, hash } = generateGuestRefreshToken();
    const expiresAt = new Date(Date.now() + env.GUEST_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await guestAuthRepository.storeRefreshToken(guest.id, hash, expiresAt);
    return { accessToken, refreshToken, guest: toProfile(guest) };
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