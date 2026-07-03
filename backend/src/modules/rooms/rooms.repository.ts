import { pool } from "../../config/db";

export const roomsRepository = {
  // --- Room types ---
  async createRoomType(propertyId: string, data: { name: string; baseRate: number; maxOccupancy: number }) {
    const { rows } = await pool.query(
      `INSERT INTO room_types (property_id, name, base_rate, max_occupancy)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [propertyId, data.name, data.baseRate, data.maxOccupancy]
    );
    return rows[0];
  },

  async listRoomTypes(propertyId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM room_types WHERE property_id = $1 AND is_active = true ORDER BY name`,
      [propertyId]
    );
    return rows;
  },

  async findRoomTypeById(id: string) {
    const { rows } = await pool.query(`SELECT * FROM room_types WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  // --- Rooms ---
  async createRoom(data: { roomTypeId: string; roomNumber: string }) {
    const { rows } = await pool.query(
      `INSERT INTO rooms (room_type_id, room_number) VALUES ($1, $2) RETURNING *`,
      [data.roomTypeId, data.roomNumber]
    );
    return rows[0];
  },

  async listRoomsByProperty(propertyId: string) {
    const { rows } = await pool.query(
      `SELECT r.*, rt.name AS room_type_name, rt.base_rate
       FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE rt.property_id = $1 AND r.is_active = true
       ORDER BY rt.name, r.room_number`,
      [propertyId]
    );
    return rows;
  },

  async findRoomById(id: string) {
    const { rows } = await pool.query(
      `SELECT r.*, rt.property_id FROM rooms r JOIN room_types rt ON rt.id = r.room_type_id WHERE r.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async updateRoomStatus(id: string, status: string) {
    const { rows } = await pool.query(`UPDATE rooms SET status = $2 WHERE id = $1 RETURNING *`, [id, status]);
    return rows[0] ?? null;
  },

  // --- Rate plans ---
  async createRatePlan(data: {
    roomTypeId: string;
    name: string;
    rateMultiplier: number;
    cancellationPolicy?: string;
    validFrom?: string;
    validTo?: string;
  }) {
    const { rows } = await pool.query(
      `INSERT INTO rate_plans (room_type_id, name, rate_multiplier, cancellation_policy, valid_from, valid_to)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.roomTypeId,
        data.name,
        data.rateMultiplier,
        data.cancellationPolicy ?? null,
        data.validFrom ?? null,
        data.validTo ?? null
      ]
    );
    return rows[0];
  },

  async listRatePlansByRoomType(roomTypeId: string) {
    const { rows } = await pool.query(`SELECT * FROM rate_plans WHERE room_type_id = $1`, [roomTypeId]);
    return rows;
  },

  async findRatePlanById(id: string) {
    const { rows } = await pool.query(`SELECT * FROM rate_plans WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  /** Rooms of a given type that have no overlapping active reservation for the requested date range. */
  async findAvailableRooms(propertyId: string, checkIn: string, checkOut: string) {
    const { rows } = await pool.query(
      `SELECT r.id AS room_id, r.room_number, rt.id AS room_type_id, rt.name AS room_type_name,
              rt.base_rate, rt.max_occupancy
       FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE rt.property_id = $1
         AND r.is_active = true
         AND r.status != 'OUT_OF_ORDER'
         AND NOT EXISTS (
           SELECT 1 FROM reservations res
           WHERE res.room_id = r.id
             AND res.status IN ('CONFIRMED', 'CHECKED_IN')
             AND res.stay_range && tstzrange($2::timestamptz, $3::timestamptz, '[)')
         )
       ORDER BY rt.name, r.room_number`,
      [propertyId, checkIn, checkOut]
    );
    return rows;
  }
};
