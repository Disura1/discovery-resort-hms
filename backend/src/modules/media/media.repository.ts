import { pool } from "../../config/db";

export interface MediaRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  kind: "IMAGE" | "VIDEO" | "DOCUMENT";
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  is_public: boolean;
  status: "PENDING" | "CONFIRMED";
  property_id: string | null;
  uploaded_by: string | null;
  uploaded_by_guest: string | null;
  created_at: Date;
}

export const mediaRepository = {
  async create(data: {
    entityType: string;
    entityId: string;
    kind: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    isPublic: boolean;
    propertyId: string | null;
    uploadedBy: string | null;
    uploadedByGuest: string | null;
  }): Promise<MediaRecord> {
    const { rows } = await pool.query(
      `INSERT INTO media
         (entity_type, entity_id, kind, storage_key, original_name, mime_type,
          size_bytes, is_public, property_id, uploaded_by, uploaded_by_guest)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.entityType, data.entityId, data.kind, data.storageKey, data.originalName,
        data.mimeType, data.sizeBytes, data.isPublic, data.propertyId, data.uploadedBy, data.uploadedByGuest
      ]
    );
    return rows[0];
  },

  async findById(id: string): Promise<MediaRecord | null> {
    const { rows } = await pool.query(`SELECT * FROM media WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async markConfirmed(id: string): Promise<MediaRecord | null> {
    const { rows } = await pool.query(
      `UPDATE media SET status = 'CONFIRMED' WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },

  async listByEntity(entityType: string, entityId: string): Promise<MediaRecord[]> {
    const { rows } = await pool.query(
      `SELECT * FROM media WHERE entity_type = $1 AND entity_id = $2 AND status = 'CONFIRMED'
       ORDER BY created_at ASC`,
      [entityType, entityId]
    );
    return rows;
  },

  async delete(id: string): Promise<MediaRecord | null> {
    const { rows } = await pool.query(`DELETE FROM media WHERE id = $1 RETURNING *`, [id]);
    return rows[0] ?? null;
  },

  /** Sweeps uploads that never got confirmed (client abandoned the upload, browser crashed, etc). */
  async findStalePending(olderThanMinutes: number): Promise<MediaRecord[]> {
    const { rows } = await pool.query(
      `SELECT * FROM media WHERE status = 'PENDING' AND created_at < now() - ($1 || ' minutes')::interval`,
      [olderThanMinutes]
    );
    return rows;
  }
};