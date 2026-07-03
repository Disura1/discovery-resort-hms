import { authRepository } from "./auth.repository";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import { recordAudit } from "../audit/audit.service";
import { env } from "../../config/env";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const authService = {
  async login(email: string, password: string, ip: string | undefined) {
    const staff = await authRepository.findByEmail(email);

    // Return the same generic error whether the account doesn't exist or the
    // password is wrong, to avoid leaking which emails are registered.
    const genericError = () => AppError.unauthorized("Invalid email or password");

    if (!staff || !staff.is_active) throw genericError();

    if (staff.locked_until && staff.locked_until > new Date()) {
      throw AppError.forbidden(
        `Account temporarily locked due to repeated failed login attempts. Try again after ${staff.locked_until.toISOString()}.`
      );
    }

    const passwordValid = await verifyPassword(password, staff.password_hash);
    if (!passwordValid) {
      const attempts = await authRepository.registerFailedLogin(staff.id);
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await authRepository.lockAccount(staff.id, until);
      }
      throw genericError();
    }

    await authRepository.resetFailedLogins(staff.id);

    const accessToken = signAccessToken({ sub: staff.id, role: staff.role, propertyId: staff.property_id });
    const { token: refreshToken, hash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await authRepository.storeRefreshToken(staff.id, hash, expiresAt);

    await recordAudit({
      staffId: staff.id,
      propertyId: staff.property_id,
      action: "auth.login",
      entityType: "staff",
      entityId: staff.id,
      metadata: { ip }
    });

    return {
      accessToken,
      refreshToken,
      staff: {
        id: staff.id,
        fullName: staff.full_name,
        email: staff.email,
        role: staff.role,
        propertyId: staff.property_id
      }
    };
  },

  async refresh(refreshToken: string) {
    const hash = hashRefreshToken(refreshToken);
    const record = await authRepository.findValidRefreshToken(hash);
    if (!record) throw AppError.unauthorized("Invalid or expired refresh token");

    const staff = await authRepository.findById(record.staff_id);
    if (!staff || !staff.is_active) throw AppError.unauthorized("Account is no longer active");

    // Rotate the refresh token: revoke the old one, issue a new one.
    await authRepository.revokeRefreshToken(hash);
    const { token: newRefreshToken, hash: newHash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await authRepository.storeRefreshToken(staff.id, newHash, expiresAt);

    const accessToken = signAccessToken({ sub: staff.id, role: staff.role, propertyId: staff.property_id });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string) {
    await authRepository.revokeRefreshToken(hashRefreshToken(refreshToken));
  },

  async createStaff(input: {
    fullName: string;
    email: string;
    password: string;
    role: string;
    propertyId: string | null;
  }, actor: { staffId: string; propertyId: string | null }) {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict("A staff account with this email already exists");

    const passwordHash = await hashPassword(input.password);
    const staff = await authRepository.createStaff({ ...input, passwordHash });

    await recordAudit({
      staffId: actor.staffId,
      propertyId: actor.propertyId,
      action: "staff.create",
      entityType: "staff",
      entityId: staff.id,
      metadata: { role: staff.role, email: staff.email }
    });

    return {
      id: staff.id,
      fullName: staff.full_name,
      email: staff.email,
      role: staff.role,
      propertyId: staff.property_id
    };
  }
};
