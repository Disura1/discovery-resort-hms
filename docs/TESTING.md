# Testing Strategy

## Backend: integration tests against a real database

`backend/tests/` uses Jest + Supertest to exercise the Express app through real HTTP-shaped requests (`supertest(app)`), against a **real PostgreSQL instance** (`hms_test`) rather than mocks. This is a deliberate choice: the most important correctness guarantee in this system — that two reservations can never overlap on the same room — lives in a database exclusion constraint, not in application code. Mocking the database would test nothing meaningful for that guarantee.

### What's covered today

- **`tests/auth.test.ts`**: login success/failure paths, generic error messages for both wrong-password and unknown-email (no user enumeration), token issuance, `/auth/me`.
- **`tests/reservations.test.ts`**: the full reservation lifecycle —
  - creating a reservation auto-generates a folio with per-night charges,
  - an overlapping booking on the same room is rejected with `409 CONFLICT` (proves the exclusion constraint works, not just that the code compiles),
  - a booking starting exactly when a previous one ends is accepted (proves the range boundary is `[)` half-open, not overly strict),
  - check-out is blocked while the folio balance is positive,
  - check-out succeeds once a payment brings the balance to zero, and flips the room to `DIRTY`,
  - a repeated payment with the same idempotency key does not create a duplicate charge,
  - RBAC: a Housekeeping account is forbidden from creating a room type but is allowed to update room status.
- **`tests/guestPortal.test.ts`**: the OTP login flow and guest-portal security boundaries —
  - correct/incorrect OTP verification, including a code with no pending request at all,
  - a guest access token is rejected on staff-only endpoints and a staff token is rejected on guest-only endpoints (proves the two token types can't be cross-used, not just that they're issued differently),
  - a logged-in guest's booking is linked to their own canonical guest record and appears in their My Bookings list,
  - a *different* guest gets `404` (not `403`) when directly requesting, cancelling, or requesting an invoice for someone else's reservation — proving ownership is checked server-side, not just hidden in the UI,
  - cancelling releases the room for rebooking (reuses the same exclusion-constraint guarantee),
  - a PDF invoice is returned with the correct content type,
  - feedback can only be attached to a reservation the submitting guest actually owns,
  - the per-email OTP request cooldown returns `429` on a second immediate request.

### Running the tests

```bash
createdb hms_test
psql -d hms_test -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"
cd backend
npm test
```

`tests/globalSetup.ts` drops and recreates the `public` schema and re-runs all migrations before the suite starts, so tests always run against a clean, known schema. Each test file seeds its own fixtures with a unique suffix (`tests/helpers.ts`) so multiple test files can share the same database without email/unique-constraint collisions.

### Extending the suite

Areas that would benefit from additional coverage as the system grows:
- Folio line-item and payment endpoints in isolation (currently covered indirectly through the reservation lifecycle test).
- Refresh-token rotation and reuse detection.
- Reports endpoints (occupancy/revenue/ADR calculations) against seeded historical data.
- Multi-property data isolation (verifying a Manager scoped to Property A cannot read Property B's reservations).

## Frontend

The frontend currently relies on TypeScript's type-checking (`tsc -b`) and `oxlint` as a fast correctness net, run in CI on every push. For a production rollout, adding component tests (React Testing Library) for `ReservationDetailPage`'s checkout-guard UI state and `NewReservationPage`'s booking-conflict handling would be the highest-value next additions, since those two screens carry the most business logic on the client side.

## Manual verification performed during development

Beyond the automated suite, the following was verified end-to-end against a live Postgres + Redis + Express stack before this system was considered complete:
- Full guest lifecycle: search availability → book → check in → post an extra charge → pay in cash → check out → room automatically flips to `DIRTY`.
- Double-booking rejection at the API level (`409`) when two requests target overlapping dates on the same room.
- Payment idempotency: resending the same `idempotencyKey` returns the original payment rather than charging twice.
- RBAC enforcement: Housekeeping blocked from financial/report endpoints and room-type creation, while still able to update room status.
- Production build: compiled backend (`dist/src/server.js`) and compiled frontend (`vite build`) both run correctly, not just the dev servers.
