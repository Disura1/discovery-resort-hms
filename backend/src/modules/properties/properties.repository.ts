import { pool } from "../../config/db";

export const propertiesRepository = {
  async create(data: { name: string; address: string; timezone: string; currency: string }) {
    const { rows } = await pool.query(
      `INSERT INTO properties (name, address, timezone, currency) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.address, data.timezone, data.currency]
    );
    return rows[0];
  },

  async findAll() {
    const { rows } = await pool.query(`SELECT * FROM properties ORDER BY name ASC`);
    return rows;
  },

  async findById(id: string) {
    const { rows } = await pool.query(`SELECT * FROM properties WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async update(id: string, data: Partial<{ name: string; address: string; timezone: string; currency: string }>) {
    const fields = Object.keys(data);
    if (fields.length === 0) return this.findById(id);
    const setClause = fields.map((f, i) => `${toSnake(f)} = $${i + 2}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE properties SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...fields.map((f) => (data as any)[f])]
    );
    return rows[0] ?? null;
  }
};

function toSnake(s: string) {
  return s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}
