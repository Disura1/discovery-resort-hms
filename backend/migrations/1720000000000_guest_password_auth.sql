-- Replaces guest OTP login with password-based login.
-- OTP infra (backend/src/modules/guestAuth/guestAuth.repository.ts's old
-- Redis-based code) is removed in application code; this migration adds
-- what password login needs on the guests table.

ALTER TABLE guests
  ADD COLUMN password_hash          VARCHAR(255),
  ADD COLUMN failed_login_attempts  INT NOT NULL DEFAULT 0,
  ADD COLUMN locked_until           TIMESTAMPTZ;

-- Only registered guests (i.e. those who've set a password) need a unique
-- email. Guest rows created anonymously through the public booking widget
-- are still not deduplicated by email at write time (see the long-standing
-- comment on guestsRepository.findByEmail) — a partial index preserves that
-- existing behavior for anonymous rows while enforcing uniqueness for the
-- new login path.
CREATE UNIQUE INDEX idx_guests_email_registered
  ON guests (lower(email))
  WHERE password_hash IS NOT NULL;