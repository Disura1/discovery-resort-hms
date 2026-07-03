# Hotel Management System — API Reference

Base URL (local development): `http://localhost:4000/api`
All request/response bodies are JSON. Authenticated endpoints require a bearer access token unless noted otherwise.

## Conventions

- **Auth header:** `Authorization: Bearer <accessToken>`
- **Errors:** `{ "error": { "code": "STRING_CODE", "message": "Human readable", "details": {...} } }`
- **Dates:** ISO 8601 (`2026-08-01T14:00:00Z`)
- **Money:** decimal strings from the API (e.g. `"18500.00"`) to avoid floating-point rounding; send plain numbers when creating charges/payments.
- **Idempotency:** payment creation requires a client-generated `idempotencyKey`. Resubmitting the same key returns the original payment instead of creating a duplicate.

---

## Auth

### POST /auth/login
Public. Body: `{ "email": string, "password": string }`
Returns `{ accessToken, staff }` and sets an httpOnly refresh-token cookie. Rate-limited (20 requests / 15 min / IP).

### POST /auth/refresh
Public (relies on the refresh cookie). Returns a new `{ accessToken }` and rotates the refresh cookie.

### POST /auth/logout
Revokes the current refresh token and clears the cookie.

### GET /auth/me
Auth required. Returns the decoded token claims (`sub`, `role`, `propertyId`).

### POST /auth/staff
Roles: `MANAGER`, `OWNER`. Creates a new staff account.
Body: `{ fullName, email, password, role, propertyId }`

---

## Properties

### GET /properties
Auth required. Owners see all properties on their account; other roles see only their assigned property.

### GET /properties/:propertyId
Auth required.

### POST /properties
Role: `OWNER`. Body: `{ name, address, timezone?, currency? }`

### PATCH /properties/:propertyId
Roles: `OWNER`, `MANAGER`. Partial update of the same fields.

---

## Rooms, room types, rate plans

### GET /availability
**Public** (used by the guest booking widget). Query: `propertyId, checkIn, checkOut`.
Returns rooms with no overlapping active reservation for the given range.

### GET /properties/:propertyId/room-types
Auth required.

### POST /properties/:propertyId/room-types
Role: `MANAGER`. Body: `{ name, baseRate, maxOccupancy }`

### GET /properties/:propertyId/rooms
Auth required.

### POST /rooms
Role: `MANAGER`. Body: `{ roomTypeId, roomNumber }`

### PATCH /rooms/:roomId/status
Roles: `HOUSEKEEPING`, `FRONT_DESK`, `MANAGER`. Body: `{ status }` where status is one of `AVAILABLE | OCCUPIED | DIRTY | INSPECTED | OUT_OF_ORDER`.

### GET /room-types/:roomTypeId/rate-plans
Auth required.

### POST /rate-plans
Role: `MANAGER`. Body: `{ roomTypeId, name, rateMultiplier?, cancellationPolicy?, validFrom?, validTo? }`

---

## Guests

### POST /guests
Public. Body: `{ fullName, email?, phone?, idDocumentType?, idDocumentNumber? }`

### GET /guests/search?q=
Auth required. Searches by name, email, or phone (min 2 characters).

### GET /guests/:guestId
Auth required. Returns the guest profile plus stay history.

---

## Reservations

### POST /reservations
**Public or authenticated.** Guests book via the public widget with no token; staff may create walk-in/phone bookings while authenticated (the reservation records which staff member created it).

Body:
```json
{
  "propertyId": "uuid",
  "roomId": "uuid",
  "ratePlanId": "uuid (optional)",
  "checkIn": "2026-08-01T14:00:00Z",
  "checkOut": "2026-08-03T11:00:00Z",
  "guestId": "uuid (optional if guest object is provided)",
  "guest": { "fullName": "string", "email": "string (optional)", "phone": "string (optional)" }
}
```

Response: `{ reservation, folio }`. A folio with per-night room-charge line items is created automatically.

**409 Conflict** is returned if the room is already booked for an overlapping range — this is enforced by a PostgreSQL exclusion constraint, not just application logic, so it holds even under concurrent requests.

### GET /reservations?propertyId=&from=&to=&status=
Auth required. Lists reservations for a property, optionally filtered.

### GET /reservations/:reservationId
Auth required.

### POST /reservations/:reservationId/checkin
Roles: `FRONT_DESK`, `MANAGER`. Only valid from status `CONFIRMED`. Sets the room to `OCCUPIED`.

### POST /reservations/:reservationId/checkout
Roles: `FRONT_DESK`, `MANAGER`. Only valid from status `CHECKED_IN`, and **only if the folio balance is zero or less** (409 otherwise). Sets the room to `DIRTY` and closes the folio.

### PATCH /reservations/:reservationId/status
Roles: `FRONT_DESK`, `MANAGER`. Body: `{ status: "CANCELLED" | "NO_SHOW" }`. Only valid from `PENDING`/`CONFIRMED`.

---

## Folios & payments

### GET /folios/:folioId
Auth required. Returns `{ folio, lineItems, payments }`.

### GET /folios/by-reservation/:reservationId
Auth required. Convenience lookup since reservations and folios are 1:1.

### POST /folios/:folioId/items
Roles: `FRONT_DESK`, `MANAGER`. Body: `{ description, amount }`. `amount` may be negative for adjustments/discounts.

### POST /folios/:folioId/payments
Roles: `FRONT_DESK`, `MANAGER`, `ACCOUNTANT`. Body: `{ method: "CARD"|"CASH"|"BANK_TRANSFER", amount, idempotencyKey }`.

- `CASH` / `BANK_TRANSFER`: recorded as `SUCCEEDED` immediately (staff is confirming money already received).
- `CARD`: creates a Stripe PaymentIntent and returns `clientSecret` for the frontend to confirm with Stripe Elements/SDK. The payment stays `PENDING` until the webhook confirms it.

### POST /webhooks/payment-gateway
Called by Stripe, not by the frontend. Verifies the `Stripe-Signature` header and updates the matching payment's status on `payment_intent.succeeded` / `payment_intent.payment_failed`.

---

## Housekeeping

### GET /housekeeping/properties/:propertyId/board
Roles: `HOUSEKEEPING`, `FRONT_DESK`, `MANAGER`. Returns every room's current status for the housekeeping board view.

---

## Reports

All report endpoints require roles `MANAGER` or `ACCOUNTANT`, and take `propertyId, from, to` as query parameters (dates as `YYYY-MM-DD`).

### GET /reports/occupancy
Daily occupied-room count and occupancy rate across the range.

### GET /reports/revenue
Daily and total revenue from **succeeded payments** within the range.

### GET /reports/adr-revpar
Average Daily Rate and Revenue Per Available Room for the range.

---

## Guest Auth (OTP login)

The guest portal uses email-only OTP login — no passwords. Guest sessions use entirely separate JWT secrets from staff sessions, so a guest token is cryptographically rejected by every staff endpoint and vice versa, even if replayed deliberately.

### POST /guest-auth/request-otp
Public. Body: `{ "email": string }`. Always returns a generic 200 message regardless of whether the email has booked before (avoids confirming which emails are known to the system). Rate-limited to one request per email per 60 seconds via a Redis lock, in addition to the standard per-IP rate limit.

### POST /guest-auth/verify-otp
Public. Body: `{ "email": string, "code": "6 digits", "fullName": "string (optional, used only the first time)" }`.
Returns `{ accessToken, guest }` and sets an httpOnly guest refresh cookie. A code allows up to 5 incorrect attempts before it's invalidated; codes expire after `GUEST_OTP_TTL_MINUTES` (default 10).

### POST /guest-auth/refresh
Rotates the guest session using the refresh cookie, same pattern as staff auth.

### POST /guest-auth/logout
Revokes the current guest refresh token.

---

## Guest portal (requires a guest session)

All routes below require `Authorization: Bearer <guestAccessToken>` and are mounted under `/guest`.

### GET /guest/me
Returns the logged-in guest's profile.

### POST /guest/bookings
Same shape as the public reservation endpoint, minus guest details — the reservation is always attached to the authenticated guest's canonical record (never creates a duplicate inline guest row). Body: `{ propertyId, roomId, ratePlanId?, checkIn, checkOut }`.

### GET /guest/bookings
Returns only the authenticated guest's own reservations ("My Bookings").

### GET /guest/bookings/:reservationId
Returns booking + folio detail — **404 (not 403)** if the reservation belongs to a different guest, to avoid confirming a given reservation ID exists to someone who doesn't own it.

### POST /guest/bookings/:reservationId/cancel
Same ownership check as above. Only valid while the reservation is still `PENDING`/`CONFIRMED` — a guest who has already checked in needs to go through the front desk, not self-serve an early departure here.

### GET /guest/bookings/:reservationId/invoice
Streams a PDF invoice (`Content-Type: application/pdf`) for the reservation's folio. Same ownership check.

### POST /guest/feedback
Body: `{ reservationId?, propertyId?, rating (1-5), comment? }`. If `reservationId` is supplied, it must belong to the authenticated guest.

---

## Feedback (staff view)

### GET /feedback?propertyId=
Role: `MANAGER`. Lists feedback submitted for a property, most recent first.

---

## Public

### GET /properties/public
Public. Minimal hotel listing (`id, name, address, currency`) — used by the guest portal and booking widget to pick a property, without exposing anything staff-only.

---

## Error codes

| Code | HTTP status | Meaning |
|---|---|---|
| `BAD_REQUEST` | 400 | Validation failure (see `details` for field errors) |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Authenticated, but the role lacks permission |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Business-rule conflict (double-booking, outstanding balance, duplicate email) |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
