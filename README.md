# Hotel Management System

A production-oriented, multi-property hotel management system: reservations, room inventory, billing/folios, payments, housekeeping, role-based staff access, and operational reporting.

This repository implements the design described in `docs/` (Project Proposal, SRS, SDD, Database Design, UI/UX Design).

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS v4, TanStack Query, React Router |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 (raw SQL via `pg`, hand-written migrations) |
| Cache / rate limiting | Redis |
| Auth | JWT access tokens + httpOnly rotating refresh tokens, bcrypt password hashing |
| Payments | Stripe (PaymentIntents + webhooks); swappable for a regional gateway (e.g. PayHere) |
| Testing | Jest + Supertest (backend integration tests against a real Postgres instance) |
| Deployment | Docker (multi-stage builds), Docker Compose, GitHub Actions CI |

> **Note on the data layer:** the Database Design Document specifies PostgreSQL exclusion constraints to guarantee no double-booking at the database level. This repo implements that with hand-written SQL migrations and the `pg` driver rather than an ORM like Prisma, because Prisma's migration engine requires downloading a platform binary from `binaries.prisma.sh` at `generate`/`migrate` time — this is blocked in fully offline/locked-down build environments. Raw SQL migrations also make the exclusion constraint (`EXCLUDE USING gist (...)`) and the folio-balance trigger explicit and auditable, which matters for a financial system. If your environment can reach Prisma's binary host, swapping in Prisma is a straightforward follow-up.

## Repository layout

```
hotel-management-system/
├── backend/            Express API (see backend/README below)
├── frontend/            React staff dashboard + public booking widget
├── docs/                 Project Proposal, SRS, SDD, DB Design, UI/UX Design (.docx + .pdf), API reference
├── docker-compose.yml   Full stack: Postgres, Redis, backend, frontend (nginx)
└── .github/workflows/  CI: lint, type-check, test, build
```

## Quick start (Docker Compose)

```bash
cp .env.example .env
# edit .env: set JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD, Stripe keys

docker compose up --build

# In a separate terminal, run migrations and seed demo data:
docker compose exec backend node dist/scripts/migrate.js
docker compose exec backend node dist/scripts/seed.js
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:4000/api
- Demo logins are printed by the seed script (see `backend/scripts/seed.ts` for the full list), e.g. `manager@grandlotus.test` / `ManagerPass123!`.

## Local development (without Docker)

Requires Node.js 20+, PostgreSQL 16+ (with the `btree_gist` extension available), and Redis 7+.

### 1. Database

```bash
createdb hms_dev
psql -d hms_dev -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, JWT secrets
npm install
npm run migrate         # applies migrations/*.sql
npm run seed             # creates a demo property, rooms, and staff logins
npm run dev               # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to the backend automatically
```

### 4. Run the test suite

```bash
cd backend
npm test   # spins up its own schema against a separate `hms_test` database
```
Create the test database once beforehand: `createdb hms_test && psql -d hms_test -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"`

## Key design decisions (see `docs/` for full detail)

- **Double-booking prevention is enforced by the database**, not just application code: a PostgreSQL `EXCLUDE` constraint on `(room_id, stay_range)` makes an overlapping reservation physically impossible to insert, even under concurrent requests. See `backend/migrations/1719800000000_init.sql`.
- **Folio balances are maintained by a database trigger**, recalculated from line items and successful payments on every insert/update/delete — the balance can never silently drift out of sync with its underlying charges.
- **RBAC is enforced at the API layer** (`backend/src/middleware/authorize.ts`), not just hidden in the UI — a restricted role gets a 403 even calling the API directly.
- **Payments never touch raw card data.** Card payments go through Stripe PaymentIntents; the payment only becomes `SUCCEEDED` once Stripe's webhook confirms it, not on the client's say-so.
- **Idempotency keys** on payment creation prevent double-charging on network retries or double-clicks.
- **Guest sessions are fully isolated from staff sessions.** Guests log in via emailed OTP (no password) and get a JWT signed with entirely separate secrets from staff tokens — a guest token is cryptographically rejected on every staff endpoint, and vice versa. Every guest-portal endpoint also checks resource ownership (a guest can only see/cancel/invoice *their own* bookings), returning 404 rather than 403 for someone else's reservation to avoid confirming it exists.
- **Modular monolith**, not microservices — see SDD Section 8 for the reasoning.

## Guest portal

Guests can log in with just their email (a 6-digit code, no password), browse availability, book a room, and from **My Bookings** cancel a confirmed reservation, download a PDF invoice, and leave feedback after checkout.

- Frontend routes: `/guest/login`, `/guest` (browse & book), `/guest/bookings`, `/guest/bookings/:id`, `/guest/feedback`
- Backend routes: `/api/guest-auth/*` (OTP login) and `/api/guest/*` (bookings, cancel, invoice, feedback) — see `docs/API_DOCUMENTATION.md`

**Email delivery in development:** if `SMTP_HOST` is left blank in `backend/.env`, the OTP is logged to the backend console instead of emailed (`backend/src/utils/mailer.ts`) — this is what lets you exercise the whole login flow locally without a real mailbox. Set `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` for real delivery in production (any standard SMTP provider works — Postmark, SES, SendGrid's SMTP endpoint, etc.).

The original anonymous `/book?property=<id>` widget (no login required) still exists alongside the guest portal — useful for a marketing-site embed where you don't want to force a login before showing rates.

## Deployment

See `backend/Dockerfile` and `frontend/Dockerfile` for production images, and `docker-compose.yml` for a small-scale single-host deployment. For larger deployments, the SDD recommends managed Postgres/Redis (e.g. AWS RDS/ElastiCache) with the backend running as multiple stateless containers behind a load balancer — nothing in the codebase assumes a single backend instance (sessions live in JWTs/Redis, not in-process memory).

Database migrations are intentionally **not** run automatically on container start — run `node dist/scripts/migrate.js` as an explicit, reviewed deployment step, per the SDD's CI/CD guidance.

## Documentation

- `docs/1_Project_Proposal.docx` / `.pdf`
- `docs/2_Software_Requirements_Specification.docx` / `.pdf`
- `docs/3_Software_Design_Document.docx` / `.pdf`
- `docs/4_Database_Design_Document.docx` / `.pdf`
- `docs/5_UI_UX_Design_Document.docx` / `.pdf`
- `docs/API_DOCUMENTATION.md` — full REST API reference
