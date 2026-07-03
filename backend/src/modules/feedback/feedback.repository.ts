import { pool } from "../../config/db";

export const feedbackRepository = {
  async create(data: {
    guestId: string;
    reservationId: string | null;
    propertyId: string | null;
    rating: number;
    comment: string | null;
  }) {
    const { rows } = await pool.query(
      `INSERT INTO feedback (guest_id, reservation_id, property_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.guestId, data.reservationId, data.propertyId, data.rating, data.comment]
    );
    return rows[0];
  },

  async listByProperty(propertyId: string) {
    const { rows } = await pool.query(
      `SELECT f.*, g.full_name AS guest_name
       FROM feedback f
       JOIN guests g ON g.id = f.guest_id
       WHERE f.property_id = $1
       ORDER BY f.created_at DESC
       LIMIT 200`,
      [propertyId]
    );
    return rows;
  },

  async belongsToGuest(reservationId: string, guestId: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM reservations WHERE id = $1 AND guest_id = $2`,
      [reservationId, guestId]
    );
    return rows.length > 0;
  }
};
