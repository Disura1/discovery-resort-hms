import { z } from "zod";

const ALLOWED_MIME_TYPES = {
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
  VIDEO: ["video/mp4", "video/webm"],
  DOCUMENT: ["application/pdf"]
} as const;

export const ALL_ALLOWED_MIME_TYPES = Object.values(ALLOWED_MIME_TYPES).flat();

function kindForMime(mime: string): "IMAGE" | "VIDEO" | "DOCUMENT" {
  if ((ALLOWED_MIME_TYPES.IMAGE as readonly string[]).includes(mime)) return "IMAGE";
  if ((ALLOWED_MIME_TYPES.VIDEO as readonly string[]).includes(mime)) return "VIDEO";
  return "DOCUMENT";
}
export { kindForMime };

const MAX_SIZE_BYTES = {
  IMAGE: 10 * 1024 * 1024,   // 10MB
  VIDEO: 200 * 1024 * 1024,  // 200MB
  DOCUMENT: 20 * 1024 * 1024 // 20MB
} as const;
export { MAX_SIZE_BYTES };

export const requestUploadSchema = z
  .object({
    entityType: z.enum(["PROPERTY", "ROOM_TYPE", "RESERVATION", "GUEST", "FEEDBACK"]),
    entityId: z.string().uuid(),
    fileName: z.string().min(1).max(255),
    mimeType: z.enum(ALL_ALLOWED_MIME_TYPES as [string, ...string[]]),
    sizeBytes: z.number().int().positive(),
    isPublic: z.boolean().default(false)
  })
  .refine((data) => data.sizeBytes <= MAX_SIZE_BYTES[kindForMime(data.mimeType)], {
    message: "File exceeds the maximum allowed size for its type",
    path: ["sizeBytes"]
  });

export const confirmUploadSchema = z.object({
  mediaId: z.string().uuid()
});

export const listMediaQuerySchema = z.object({
  entityType: z.enum(["PROPERTY", "ROOM_TYPE", "RESERVATION", "GUEST", "FEEDBACK"]),
  entityId: z.string().uuid()
});