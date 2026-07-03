import { PoolClient } from "pg";
import { pool } from "../../config/db";

export const reservationsRepository = {
  async insert(
    client: PoolClient,
    data: {
      propertyId: string;
      roomId: string;
      guestId: string;
      ratePlanId: string | null;
      checkIn: string;
      checkOut: string;
      createdBy: string | null;
    }
  ) {
    const { rows } = await client.query(
      `INSERT INTO reservations (property_id, room_id, guest_id, rate_plan_id, check_in, check_out, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.propertyId, data.roomId, data.guestId, data.ratePlanId, data.checkIn, data.checkOut, data.createdBy]
    );
    return rows[0];
  },

  async findById(id: string) {
    const { rows } = await pool.query(
      `SELECT res.*, g.full_name AS guest_name, g.email AS guest_email, g.phone AS guest_phone,
              r.room_number, rt.name AS room_type_name, rt.property_id
       FROM reservations res
       JOIN guests g ON g.id = res.guest_id
       JOIN rooms r ON r.id = res.room_id
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE res.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async listByProperty(propertyId: string, filters: { from?: string; to?: string; status?: string }) {
    const conditions = ["res.property_id = $1"];
    const params: unknown[] = [propertyId];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`res.status = $${params.length}`);
    }
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`res.check_out > $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`res.check_in < $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT res.*, g.full_name AS guest_name, r.room_number, rt.name AS room_type_name
       FROM reservations res
       JOIN guests g ON g.id = res.guest_id
       JOIN rooms r ON r.id = res.room_id
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY res.check_in ASC`,
      params
    );
    return rows;
  },

  async listByGuest(guestId: string) {
    const { rows } = await pool.query(
      `SELECT res.*, r.room_number, rt.name AS room_type_name, p.name AS property_name
       FROM reservations res
       JOIN rooms r ON r.id = res.room_id
       JOIN room_types rt ON rt.id = r.room_type_id
       JOIN properties p ON p.id = res.property_id
       WHERE res.guest_id = $1
       ORDER BY res.check_in DESC`,
      [guestId]
    );
    return rows;
  },

  async updateStatus(client: PoolClient | typeof pool, id: string, status: string) {
    const { rows } = await client.query(`UPDATE reservations SET status = $2 WHERE id = $1 RETURNING *`, [id, status]);
    return rows[0] ?? null;
  }
};
