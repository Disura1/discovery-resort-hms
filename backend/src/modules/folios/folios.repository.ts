import { PoolClient } from "pg";
import { pool } from "../../config/db";

export const foliosRepository = {
  async create(client: PoolClient, reservationId: string) {
    const { rows } = await client.query(
      `INSERT INTO folios (reservation_id) VALUES ($1) RETURNING *`,
      [reservationId]
    );
    return rows[0];
  },

  async findByReservationId(reservationId: string) {
    const { rows } = await pool.query(`SELECT * FROM folios WHERE reservation_id = $1`, [reservationId]);
    return rows[0] ?? null;
  },

  async findById(id: string) {
    const { rows } = await pool.query(`SELECT * FROM folios WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async addLineItem(
    client: PoolClient | typeof pool,
    data: { folioId: string; description: string; amount: number; postedBy: string | null }
  ) {
    const { rows } = await client.query(
      `INSERT INTO folio_line_items (folio_id, description, amount, posted_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.folioId, data.description, data.amount, data.postedBy]
    );
    return rows[0];
  },

  async listLineItems(folioId: string) {
    const { rows } = await pool.query(
      `SELECT fli.*, s.full_name AS posted_by_name
       FROM folio_line_items fli
       LEFT JOIN staff s ON s.id = fli.posted_by
       WHERE fli.folio_id = $1 ORDER BY fli.posted_at ASC`,
      [folioId]
    );
    return rows;
  },

  async listPayments(folioId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM payments WHERE folio_id = $1 ORDER BY created_at ASC`,
      [folioId]
    );
    return rows;
  },

  async addPayment(
    client: PoolClient | typeof pool,
    data: {
      folioId: string;
      method: string;
      amount: number;
      status: string;
      gatewayReference?: string | null;
      idempotencyKey?: string | null;
    }
  ) {
    const { rows } = await client.query(
      `INSERT INTO payments (folio_id, method, amount, status, gateway_reference, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.folioId, data.method, data.amount, data.status, data.gatewayReference ?? null, data.idempotencyKey ?? null]
    );
    return rows[0];
  },

  async findPaymentByIdempotencyKey(key: string) {
    const { rows } = await pool.query(`SELECT * FROM payments WHERE idempotency_key = $1`, [key]);
    return rows[0] ?? null;
  },

  async findPaymentByGatewayReference(ref: string) {
    const { rows } = await pool.query(`SELECT * FROM payments WHERE gateway_reference = $1`, [ref]);
    return rows[0] ?? null;
  },

  async updatePaymentStatus(id: string, status: string) {
    const { rows } = await pool.query(`UPDATE payments SET status = $2 WHERE id = $1 RETURNING *`, [id, status]);
    return rows[0] ?? null;
  },

  async closeFolio(client: PoolClient | typeof pool, folioId: string) {
    await client.query(`UPDATE folios SET status = 'CLOSED' WHERE id = $1`, [folioId]);
  }
};
