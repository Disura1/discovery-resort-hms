import { pool } from "../../config/db";
import type { PoolClient } from "pg";

interface AuditEntry {
  staffId: string | null;
  propertyId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(entry: AuditEntry, client?: PoolClient) {
  const runner = client ?? pool;
  await runner.query(
    `INSERT INTO audit_log (staff_id, property_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entry.staffId, entry.propertyId, entry.action, entry.entityType, entry.entityId, entry.metadata ?? null]
  );
}
