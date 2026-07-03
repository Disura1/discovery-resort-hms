import { pool } from "../../config/db";

export interface CreateGuestInput {
  fullName: string;
  email?: string;
  phone?: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
}

export const guestsRepository = {
  async create(data: CreateGuestInput) {
    const { rows } = await pool.query(
      `INSERT INTO guests (full_name, email, phone, id_document_type, id_document_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.fullName, data.email ?? null, data.phone ?? null, data.idDocumentType ?? null, data.idDocumentNumber ?? null]
    );
    return rows[0];
  },
  async findById(id: string) {
    const { rows } = await pool.query(`SELECT * FROM guests WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  /**
   * Returns the earliest-created guest row matching this email, treated as
   * the "canonical" guest identity for OTP login purposes. Guest rows
   * created through the anonymous booking widget are not deduplicated by
   * email at write time, so this is a best-effort match rather than a hard
   * uniqueness guarantee — see docs/API_DOCUMENTATION.md for the known
   * limitation this implies for "My Bookings" made before a guest's first login.
   */
  async findByEmail(email: string) {
    const { rows } = await pool.query(
      `SELECT * FROM guests WHERE lower(email) = lower($1) ORDER BY created_at ASC LIMIT 1`,
      [email]
    );
    return rows[0] ?? null;
  },

  async findOrCreateByEmail(email: string, fullNameIfCreating: string) {
    const existing = await this.findByEmail(email);
    if (existing) return existing;
    return this.create({ fullName: fullNameIfCreating, email });
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
