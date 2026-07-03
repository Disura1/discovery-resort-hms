# HMS Backend

Express + TypeScript REST API for the Hotel Management System. See the root `README.md` for full-stack setup and `../docs/API_DOCUMENTATION.md` for the endpoint reference.

## Structure

```
src/
├── app.ts                 Express app wiring (middleware, routes)
├── server.ts                Process entry point, graceful shutdown
├── config/                 env, Postgres pool, Redis client
├── middleware/           auth, RBAC, validation, error handling, rate limiting
├── modules/
│   ├── auth/                 login, refresh, staff creation
│   ├── guestAuth/          OTP request/verify, guest session refresh (separate token secrets from staff)
│   ├── guest/                 guest-scoped bookings: create, My Bookings, cancel, invoice download, feedback
│   ├── feedback/            staff-side feedback listing
│   ├── properties/
│   ├── rooms/                room types, rooms, rate plans, availability search
│   ├── guests/                guest profile records (created by staff bookings or guest OTP login)
│   ├── reservations/     booking lifecycle (create/checkin/checkout/cancel)
│   ├── folios/               charges, payments, folio detail, PDF invoice generation
│   ├── payments/          Stripe integration + webhook handler
│   ├── housekeeping/    room status board
│   ├── reports/             occupancy, revenue, ADR/RevPAR
│   └── audit/                shared audit-log writer
└── utils/                    AppError, JWT (staff + guest), password hashing, mailer, logger, asyncHandler

migrations/    Hand-written, numbered SQL migrations (run in order, tracked in `schema_migrations`)
scripts/          migrate.ts (applies migrations), seed.ts (demo data)
tests/             Jest + Supertest integration tests against a real Postgres instance
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with hot-reload (`tsx watch`) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled build (`dist/src/server.js`) |
| `npm run migrate` | Apply pending SQL migrations (dev, via `tsx`) |
| `npm run migrate:prod` | Same, against the compiled build (`dist/scripts/migrate.js`) |
| `npm run seed` | Insert demo property/rooms/staff |
| `npm test` | Run the Jest test suite (resets the `hms_test` schema each run) |
| `npm run lint` | ESLint |

## Adding a migration

Add a new numbered file to `migrations/`, e.g. `1719900000000_add_loyalty_points.sql`. The runner (`scripts/migrate.ts`) applies any file not yet recorded in `schema_migrations`, in filename order, each inside its own transaction. Never edit an already-applied migration file — add a new one instead.

## Security notes

- Every mutating endpoint validates its input with a Zod schema (`middleware/validate.ts`) before touching the database.
- RBAC is enforced server-side (`middleware/authorize.ts`) — the frontend hiding a button is a UX nicety, not the security boundary.
- Refresh tokens are stored server-side as SHA-256 hashes only, and rotate on every use.
- Guest sessions (OTP login) use entirely separate JWT secrets from staff sessions — a guest token is cryptographically rejected by every staff endpoint, and a staff token is rejected by every guest endpoint. Every guest-portal endpoint additionally checks resource ownership server-side.
- Login is rate-limited per IP and accounts lock temporarily after 5 failed attempts.
- Card payment data never reaches this service — see `modules/payments/paymentGateway.ts`.
