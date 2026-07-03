import { pool } from "../src/config/db";
import { hashPassword } from "../src/utils/password";

export async function seedFixtures(suffix = "test") {
  const { rows: propRows } = await pool.query(
    `INSERT INTO properties (name, address) VALUES ('Test Hotel ${suffix}', '123 Test St') RETURNING id`
  );
  const propertyId = propRows[0].id;

  const { rows: rtRows } = await pool.query(
    `INSERT INTO room_types (property_id, name, base_rate, max_occupancy)
     VALUES ($1, 'Standard', 10000, 2) RETURNING id`,
    [propertyId]
  );
  const roomTypeId = rtRows[0].id;

  const { rows: roomRows } = await pool.query(
    `INSERT INTO rooms (room_type_id, room_number) VALUES ($1, '101') RETURNING id`,
    [roomTypeId]
  );
  const roomId = roomRows[0].id;

  const passwordHash = await hashPassword("FrontDesk123!");
  const { rows: staffRows } = await pool.query(
    `INSERT INTO staff (property_id, role, full_name, email, password_hash)
     VALUES ($1, 'FRONT_DESK', 'Test Front Desk', $2, $3) RETURNING id`,
    [propertyId, `frontdesk-${suffix}@test.local`, passwordHash]
  );

  const hkHash = await hashPassword("Housekeep123!");
  await pool.query(
    `INSERT INTO staff (property_id, role, full_name, email, password_hash)
     VALUES ($1, 'HOUSEKEEPING', 'Test Housekeeping', $2, $3)`,
    [propertyId, `housekeeping-${suffix}@test.local`, hkHash]
  );

  const mgrHash = await hashPassword("ManagerPass123!");
  await pool.query(
    `INSERT INTO staff (property_id, role, full_name, email, password_hash)
     VALUES ($1, 'MANAGER', 'Test Manager', $2, $3)`,
    [propertyId, `manager-${suffix}@test.local`, mgrHash]
  );

  return {
    propertyId,
    roomTypeId,
    roomId,
    staffId: staffRows[0].id,
    emails: {
      frontDesk: `frontdesk-${suffix}@test.local`,
      housekeeping: `housekeeping-${suffix}@test.local`,
      manager: `manager-${suffix}@test.local`
    }
  };
}

export async function closePool() {
  await pool.end();
}
