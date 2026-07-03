import { pool } from "../../config/db";

export interface StaffRecord {
  id: string;
  property_id: string | null;
  role: "OWNER" | "MANAGER" | "FRONT_DESK" | "HOUSEKEEPING" | "ACCOUNTANT";
  full_name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
}

export const authRepository = {
  async findByEmail(email: string): Promise<StaffRecord | null> {
    const { rows } = await pool.query<StaffRecord>(
      `SELECT id, property_id, role, full_name, email, password_hash, is_active, failed_login_attempts, locked_until
       FROM staff WHERE email = $1`,
      [email.toLowerCase()]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<StaffRecord | null> {
    const { rows } = await pool.query<StaffRecord>(
      `SELECT id, property_id, role, full_name, email, password_hash, is_active, failed_login_attempts, locked_until
       FROM staff WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async registerFailedLogin(id: string): Promise<number> {
    const { rows } = await pool.query<{ failed_login_attempts: number }>(
      `UPDATE staff SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1
       RETURNING failed_login_attempts`,
      [id]
    );
    return rows[0]?.failed_login_attempts ?? 0;
  },

  async lockAccount(id: string, until: Date): Promise<void> {
    await pool.query(`UPDATE staff SET locked_until = $2 WHERE id = $1`, [id, until]);
  },

  async resetFailedLogins(id: string): Promise<void> {
    await pool.query(`UPDATE staff SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`, [id]);
  },

  async createStaff(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    role: string;
    propertyId: string | null;
  }): Promise<StaffRecord> {
    const { rows } = await pool.query<StaffRecord>(
      `INSERT INTO staff (full_name, email, password_hash, role, property_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, property_id, role, full_name, email, password_hash, is_active, failed_login_attempts, locked_until`,
      [data.fullName, data.email.toLowerCase(), data.passwordHash, data.role, data.propertyId]
    );
    return rows[0];
  },

  async storeRefreshToken(staffId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `INSERT INTO refresh_tokens (staff_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [staffId, tokenHash, expiresAt]
    );
  },

  async findValidRefreshToken(tokenHash: string): Promise<{ id: string; staff_id: string } | null> {
    const { rows } = await pool.query(
      `SELECT id, staff_id FROM refresh_tokens
       WHERE token_hash = $1 AND revoked = false AND expires_at > now()`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await pool.query(`UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`, [tokenHash]);
  },

  async revokeAllRefreshTokensForStaff(staffId: string): Promise<void> {
    await pool.query(`UPDATE refresh_tokens SET revoked = true WHERE staff_id = $1`, [staffId]);
  }
};
