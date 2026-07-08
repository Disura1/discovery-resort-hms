import "dotenv/config";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Seeding demo data...");

  const { rows: propRows } = await pool.query(
    `INSERT INTO properties (name, address, timezone, currency)
     VALUES ('Discovery Resort', 'Muwanthenna Rd, Sri Lanka', 'Asia/Rathnapura', 'LKR')
     RETURNING id`
  );
  const propertyId = propRows[0].id;

  const staffAccounts = [
    { name: "Amara Perera", email: "owner@discoveryresort.test", role: "OWNER", password: "OwnerPass123!" },
    { name: "Kasun Fernando", email: "manager@discoveryresort.test", role: "MANAGER", password: "ManagerPass123!" },
    { name: "Dilani Silva", email: "frontdesk@discoveryresort.test", role: "FRONT_DESK", password: "FrontDesk123!" },
    { name: "Nimal Rathnayake", email: "housekeeping@discoveryresort.test", role: "HOUSEKEEPING", password: "Housekeep123!" },
    { name: "Ishara Jayasuriya", email: "accounts@discoveryresort.test", role: "ACCOUNTANT", password: "Accounts123!" }
  ];

  for (const acc of staffAccounts) {
    const hash = await bcrypt.hash(acc.password, 12);
    const scopedPropertyId = acc.role === "OWNER" ? null : propertyId;
    await pool.query(
      `INSERT INTO staff (property_id, role, full_name, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [scopedPropertyId, acc.role, acc.name, acc.email, hash]
    );
  }

  const roomTypes = [
    { name: "Standard Double", baseRate: 12000, maxOccupancy: 2, rooms: ["101", "102", "103"] },
    { name: "Deluxe Double", baseRate: 18500, maxOccupancy: 2, rooms: ["201", "202"] },
    { name: "Family Suite", baseRate: 27000, maxOccupancy: 4, rooms: ["301"] }
  ];

  for (const rt of roomTypes) {
    const { rows } = await pool.query(
      `INSERT INTO room_types (property_id, name, base_rate, max_occupancy)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [propertyId, rt.name, rt.baseRate, rt.maxOccupancy]
    );
    const roomTypeId = rows[0].id;
    for (const roomNumber of rt.rooms) {
      await pool.query(`INSERT INTO rooms (room_type_id, room_number) VALUES ($1, $2)`, [roomTypeId, roomNumber]);
    }
    await pool.query(
      `INSERT INTO rate_plans (room_type_id, name, rate_multiplier, cancellation_policy)
       VALUES ($1, 'Standard rate', 1.00, 'Free cancellation up to 24 hours before check-in')`,
      [roomTypeId]
    );
    await pool.query(
      `INSERT INTO rate_plans (room_type_id, name, rate_multiplier, cancellation_policy)
       VALUES ($1, 'Non-refundable', 0.85, 'Non-refundable; full payment charged at booking')`,
      [roomTypeId]
    );
  }

  console.log("Seed complete.");
  console.log(`Property ID: ${propertyId}`);
  console.log("Demo login credentials:");
  staffAccounts.forEach((a) => console.log(`  ${a.role.padEnd(12)} ${a.email} / ${a.password}`));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
