-- Media (images, videos, documents) attached to any entity in the system.
-- One polymorphic table, same pattern as audit_log's entity_type/entity_id,
-- so room photos, property logos, guest ID scans, and feedback attachments
-- all live in one place instead of a table per use case.

CREATE TYPE media_kind AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');
CREATE TYPE media_entity_type AS ENUM ('PROPERTY', 'ROOM_TYPE', 'RESERVATION', 'GUEST', 'FEEDBACK');

CREATE TABLE media (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    media_entity_type NOT NULL,
  entity_id      UUID NOT NULL,
  kind           media_kind NOT NULL,
  storage_key    VARCHAR(500) NOT NULL UNIQUE,
  original_name  VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  size_bytes     BIGINT NOT NULL,
  is_public      BOOLEAN NOT NULL DEFAULT false,
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING -> CONFIRMED (set once the upload is verified to exist in the bucket)
  -- Denormalized so property-scoped authorization is a single column
  -- comparison instead of a join through entity_id every time.
  property_id    UUID REFERENCES properties(id) ON DELETE CASCADE,
  uploaded_by    UUID REFERENCES staff(id),      -- null when a guest uploaded it
  uploaded_by_guest UUID REFERENCES guests(id),  -- null when staff uploaded it
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_entity ON media(entity_type, entity_id);
CREATE INDEX idx_media_property ON media(property_id);
CREATE INDEX idx_media_status_created ON media(status, created_at); -- for the orphan-cleanup sweep