-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- required for the reservation exclusion constraint

-- 2) Enum types
CREATE TYPE staff_role AS ENUM ('OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT');
CREATE TYPE room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'DIRTY', 'INSPECTED', 'OUT_OF_ORDER');
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');
CREATE TYPE folio_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE payment_method AS ENUM ('CARD', 'CASH', 'BANK_TRANSFER');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- 3) properties
CREATE TABLE properties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL,
  address     TEXT NOT NULL,
  timezone    VARCHAR(50) NOT NULL DEFAULT 'Asia/Colombo',
  currency    CHAR(3) NOT NULL DEFAULT 'LKR',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) staff
CREATE TABLE staff (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID REFERENCES properties(id) ON DELETE SET NULL,
  role                  staff_role NOT NULL,
  full_name             VARCHAR(150) NOT NULL,
  email                 VARCHAR(150) NOT NULL UNIQUE,
  password_hash         VARCHAR(255) NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  two_fa_secret         VARCHAR(255),
  failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_property ON staff(property_id);

-- 5) refresh_tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_staff ON refresh_tokens(staff_id);

-- 6) room_types
CREATE TABLE room_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  name          VARCHAR(100) NOT NULL,
  base_rate     NUMERIC(10,2) NOT NULL CHECK (base_rate >= 0),
  max_occupancy SMALLINT NOT NULL CHECK (max_occupancy > 0),
  is_active     BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_room_types_property ON room_types(property_id);

-- 7) rooms
CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id  UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  room_number   VARCHAR(20) NOT NULL,
  status        room_status NOT NULL DEFAULT 'AVAILABLE',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (room_type_id, room_number)
);

-- 8) rate_plans
CREATE TABLE rate_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id          UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  name                  VARCHAR(100) NOT NULL,
  rate_multiplier       NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  cancellation_policy   TEXT,
  valid_from            DATE,
  valid_to              DATE
);
CREATE INDEX idx_rate_plans_room_type ON rate_plans(room_type_id);

-- 9) guests
CREATE TABLE guests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           VARCHAR(150) NOT NULL,
  email               VARCHAR(150),
  phone               VARCHAR(30),
  id_document_type    VARCHAR(30),
  id_document_number  VARCHAR(60),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guests_email ON guests(email);

-- 10) reservations (stay_range is a generated column used only by the exclusion constraint)
CREATE TABLE reservations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  guest_id      UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  rate_plan_id  UUID REFERENCES rate_plans(id) ON DELETE SET NULL,
  check_in      TIMESTAMPTZ NOT NULL,
  check_out     TIMESTAMPTZ NOT NULL,
  status        reservation_status NOT NULL DEFAULT 'CONFIRMED',
  created_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  stay_range    TSTZRANGE GENERATED ALWAYS AS (tstzrange(check_in, check_out, '[)')) STORED,
  CHECK (check_out > check_in)
);
CREATE INDEX idx_reservations_property_status ON reservations(property_id, status);
CREATE INDEX idx_reservations_room_dates ON reservations(room_id, check_in, check_out);

-- The core data-integrity guarantee: no two active reservations may overlap for the same room.
-- This holds even under concurrent requests, unlike an application-level "check then insert" pattern.
ALTER TABLE reservations
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (room_id WITH =, stay_range WITH &&)
  WHERE (status IN ('CONFIRMED', 'CHECKED_IN'));

-- 11) folios
CREATE TABLE folios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE RESTRICT,
  balance         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          folio_status NOT NULL DEFAULT 'OPEN'
);

-- 12) folio_line_items
CREATE TABLE folio_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id      UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
  description   VARCHAR(200) NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  posted_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
  posted_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_folio_line_items_folio ON folio_line_items(folio_id);

-- 13) payments
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id            UUID NOT NULL REFERENCES folios(id) ON DELETE RESTRICT,
  method              payment_method NOT NULL,
  amount              NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  gateway_reference   VARCHAR(100),
  status              payment_status NOT NULL DEFAULT 'PENDING',
  idempotency_key     VARCHAR(150) UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_folio_status ON payments(folio_id, status);

-- 14) audit_log
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID REFERENCES staff(id) ON DELETE SET NULL,
  property_id   UUID REFERENCES properties(id) ON DELETE SET NULL,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     UUID NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_property_date ON audit_log(property_id, created_at);

-- 15) Trigger: keep folios.balance consistent automatically
CREATE OR REPLACE FUNCTION recalc_folio_balance() RETURNS TRIGGER AS $$
DECLARE
  target_folio_id UUID;
BEGIN
  target_folio_id := COALESCE(NEW.folio_id, OLD.folio_id);

  UPDATE folios
  SET balance = (
    COALESCE((SELECT SUM(amount) FROM folio_line_items WHERE folio_id = target_folio_id), 0)
    - COALESCE((SELECT SUM(amount) FROM payments WHERE folio_id = target_folio_id AND status = 'SUCCEEDED'), 0)
  )
  WHERE id = target_folio_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_line_items_balance
AFTER INSERT OR UPDATE OR DELETE ON folio_line_items
FOR EACH ROW EXECUTE FUNCTION recalc_folio_balance();

CREATE TRIGGER trg_payments_balance
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION recalc_folio_balance();
