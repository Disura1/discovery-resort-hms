import crypto from "crypto";
import { mediaRepository } from "./media.repository";
import { kindForMime } from "./media.schemas";
import { getPresignedPutUrl, getPresignedGetUrl, getPublicUrl, deleteObject, headObject } from "../../utils/storage";
import { AppError } from "../../utils/AppError";
import { recordAudit } from "../audit/audit.service";

// Which staff-owned entity types resolve to which property, so we can check
// scoping consistently regardless of what the media is attached to. This is
// intentionally centralized here rather than duplicated per route.
async function resolveEntityProperty(entityType: string, entityId: string): Promise<string | null> {
  const { pool } = await import("../../config/db");
  switch (entityType) {
    case "PROPERTY":
      return entityId;
    case "ROOM_TYPE": {
      const { rows } = await pool.query(`SELECT property_id FROM room_types WHERE id = $1`, [entityId]);
      return rows[0]?.property_id ?? null;
    }
    case "RESERVATION": {
      const { rows } = await pool.query(`SELECT property_id FROM reservations WHERE id = $1`, [entityId]);
      return rows[0]?.property_id ?? null;
    }
    case "FEEDBACK": {
      const { rows } = await pool.query(`SELECT property_id FROM feedback WHERE id = $1`, [entityId]);
      return rows[0]?.property_id ?? null;
    }
    case "GUEST":
      return null; // guest documents aren't property-scoped
    default:
      return null;
  }
}

export const mediaService = {
  async requestUpload(
    input: { entityType: string; entityId: string; fileName: string; mimeType: string; sizeBytes: number; isPublic: boolean },
    actor: { staffId?: string; guestId?: string; staffPropertyId?: string | null }
  ) {
    const propertyId = await resolveEntityProperty(input.entityType, input.entityId);

    // Staff scoping: same rule as everywhere else — non-owner staff can only
    // attach media to their own property's entities.
    if (actor.staffId && propertyId && actor.staffPropertyId && propertyId !== actor.staffPropertyId) {
      throw AppError.forbidden("You do not have access to this property");
    }

    const kind = kindForMime(input.mimeType);
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${input.entityType.toLowerCase()}/${input.entityId}/${crypto.randomUUID()}-${safeName}`;

    const uploadUrl = await getPresignedPutUrl(key, input.mimeType);

    const media = await mediaRepository.create({
      entityType: input.entityType,
      entityId: input.entityId,
      kind,
      storageKey: key,
      originalName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      isPublic: input.isPublic,
      propertyId,
      uploadedBy: actor.staffId ?? null,
      uploadedByGuest: actor.guestId ?? null
    });

    return { uploadUrl, mediaId: media.id };
  },

  async confirmUpload(mediaId: string, actor: { staffId?: string; guestId?: string }) {
    const media = await mediaRepository.findById(mediaId);
    if (!media) throw AppError.notFound("Upload not found");

    // Only the uploader can confirm their own pending upload.
    const owns = (actor.staffId && media.uploaded_by === actor.staffId) ||
                 (actor.guestId && media.uploaded_by_guest === actor.guestId);
    if (!owns) throw AppError.forbidden();

    // Verify the object actually exists in the bucket and matches what was
    // declared — don't trust the client's word that the upload succeeded.
    let head;
    try {
      head = await headObject(media.storage_key);
    } catch {
      throw AppError.badRequest("Upload was not found in storage. Please try again.");
    }
    if (head.ContentLength && Math.abs(head.ContentLength - media.size_bytes) > 1024) {
      throw AppError.badRequest("Uploaded file size does not match what was declared");
    }

    const confirmed = await mediaRepository.markConfirmed(mediaId);

    if (actor.staffId) {
      await recordAudit({
        staffId: actor.staffId,
        propertyId: media.property_id,
        action: "media.upload",
        entityType: media.entity_type.toLowerCase(),
        entityId: media.entity_id,
        metadata: { mediaId, mimeType: media.mime_type, sizeBytes: media.size_bytes }
      });
    }

    return confirmed;
  },

  async listForEntity(entityType: string, entityId: string, actor: { staffPropertyId?: string | null; isOwner?: boolean }) {
    const propertyId = await resolveEntityProperty(entityType, entityId);
    if (propertyId && !actor.isOwner && actor.staffPropertyId && propertyId !== actor.staffPropertyId) {
      throw AppError.forbidden("You do not have access to this property");
    }

    const items = await mediaRepository.listByEntity(entityType, entityId);
    return Promise.all(
      items.map(async (m) => ({
        id: m.id,
        originalName: m.original_name,
        mimeType: m.mime_type,
        kind: m.kind,
        sizeBytes: m.size_bytes,
        isPublic: m.is_public,
        url: m.is_public ? getPublicUrl(m.storage_key) : await getPresignedGetUrl(m.storage_key),
        createdAt: m.created_at
      }))
    );
  },

  async remove(mediaId: string, actor: { staffPropertyId?: string | null; isOwner?: boolean; staffId: string }) {
    const media = await mediaRepository.findById(mediaId);
    if (!media) throw AppError.notFound("Media not found");

    if (media.property_id && !actor.isOwner && actor.staffPropertyId !== media.property_id) {
      throw AppError.forbidden("You do not have access to this property");
    }

    await deleteObject(media.storage_key);
    await mediaRepository.delete(mediaId);

    await recordAudit({
      staffId: actor.staffId,
      propertyId: media.property_id,
      action: "media.delete",
      entityType: media.entity_type.toLowerCase(),
      entityId: media.entity_id,
      metadata: { mediaId, storageKey: media.storage_key }
    });
  }
};