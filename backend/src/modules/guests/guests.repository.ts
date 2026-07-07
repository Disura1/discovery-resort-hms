import { pool } from "../../config/db";

export interface CreateGuestInput {
  fullName: string;
  email?: string;
  phone?: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  passwordHash?: string;
}

export interface GuestAuthRecord {
  id: string;
  full_name: string;
  email: string | null;
  password_hash: string | null;
  failed_login_attempts: number;
  locked_until: Date | null;
}

export const guestsRepository = {
  async create(data: CreateGuestInput) {
    const { rows } = await pool.query(
      `INSERT INTO guests (full_name, email, phone, id_document_type, id_document_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.fullName,
        data.email ?? null,
        data.phone ?? null,
        data.idDocumentType ?? null,
        data.idDocumentNumber ?? null,
        data.passwordHash ?? null
      ]
    );
    return rows[0];
  },

  async findById(id: string) {
    const { rows } = await pool.query(`SELECT * FROM guests WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  /**
   * Returns the earliest-created guest row matching this email. Guest rows
   * created through the anonymous booking widget are not deduplicated by
   * email at write time, so this is a best-effort match rather than a hard
   * uniqueness guarantee — see docs/API_DOCUMENTATION.md for the known
   * limitation this implies for "My Bookings" made before a guest registers.
   */
  async findByEmail(email: string): Promise<GuestAuthRecord | null> {
    const { rows } = await pool.query(
      `SELECT * FROM guests WHERE lower(email) = lower($1) ORDER BY created_at ASC LIMIT 1`,
      [email]
    );
    return rows[0] ?? null;
  },

  /**
   * Attaches a password to an existing guest row (created earlier via the
   * anonymous booking widget), so registering doesn't orphan prior booking
   * history under a duplicate guest record.
   */
  async attachPassword(id: string, passwordHash: string, fullName: string) {
    const { rows } = await pool.query(
      `UPDATE guests SET password_hash = $2, full_name = $3 WHERE id = $1 RETURNING *`,
      [id, passwordHash, fullName]
    );
    return rows[0];
  },

  async registerFailedLogin(id: string): Promise<number> {
    const { rows } = await pool.query(
      `UPDATE guests SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1
       RETURNING failed_login_attempts`,
      [id]
    );
    return rows[0]?.failed_login_attempts ?? 0;
  },

  async lockAccount(id: string, until: Date): Promise<void> {
    await pool.query(`UPDATE guests SET locked_until = $2 WHERE id = $1`, [id, until]);
  },

  async resetFailedLogins(id: string): Promise<void> {
    await pool.query(`UPDATE guests SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`, [id]);
  },

  async search(term: string) {
    const { rows } = await pool.query(
      `SELECT * FROM guests WHERE full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 ORDER BY full_name LIMIT 25`,
      [`%${term}%`]
    );
    return rows;
  },

  async stayHistory(guestId: string) {
    const { rows } = await pool.query(
      `SELECT res.*, r.room_number, rt.name AS room_type_name
       FROM reservations res
       JOIN rooms r ON r.id = res.room_id
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE res.guest_id = $1
       ORDER BY res.check_in DESC`,
      [guestId]
    );
    return rows;
  }
};