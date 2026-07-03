-- Guest portal: guest login sessions and feedback.
-- OTP codes themselves are short-lived and stored in Redis, not the database
-- (see backend/src/modules/guestAuth/guestAuth.service.ts) — only the longer-
-- lived refresh token needs durable storage here.

CREATE TABLE guest_refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id    UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guest_refresh_tokens_guest ON guest_refresh_tokens(guest_id);

CREATE TABLE feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id       UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  property_id    UUID REFERENCES properties(id) ON DELETE SET NULL,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_property ON feedback(property_id, created_at);
