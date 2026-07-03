# HMS Frontend

React 19 + TypeScript staff dashboard and public booking widget, built with Vite and Tailwind CSS v4.

## Structure

```
src/
├── api/            axios client (token attach + auto-refresh), typed endpoint functions, shared types
├── auth/            AuthContext (staff session state), ProtectedRoute (role-gated routing)
├── guestAuth/    GuestAuthContext (guest OTP session state), GuestProtectedRoute
├── components/  AppLayout (staff sidebar shell), GuestLayout (guest top-nav shell), StatusBadge
├── lib/               small helpers (useCurrentProperty, uuid)
└── pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx            today's arrivals/departures
    ├── ReservationsPage.tsx      list + filters
    ├── NewReservationPage.tsx  availability search + booking form
    ├── ReservationDetailPage.tsx  check-in/out, folio, charges, payments
    ├── HousekeepingPage.tsx        room status board
    ├── ReportsPage.tsx                occupancy / revenue / ADR / RevPAR
    ├── SettingsPage.tsx              room types, rooms, and staff account management
    ├── GuestsPage.tsx                 staff-side guest search & stay history
    ├── BookingWidgetPage.tsx      public, anonymous guest-facing booking flow (no login)
    └── guest/                            the logged-in guest portal (OTP auth)
        ├── GuestLoginPage.tsx           email + OTP two-step sign-in
        ├── GuestBrowseRoomsPage.tsx  search availability & book while logged in
        ├── GuestBookingsPage.tsx       "My Bookings"
        ├── GuestBookingDetailPage.tsx  cancel booking, download PDF invoice
        └── GuestFeedbackPage.tsx        post-stay feedback form
```

## Two separate auth systems, deliberately

Staff (`AuthContext` / `api/client.ts`) and guests (`GuestAuthContext` / `api/guestClient.ts`) are entirely independent: separate axios instances, separate token storage, separate refresh endpoints, separate cookies (`hms_refresh_token` vs `hms_guest_refresh_token`, scoped to different cookie paths). This mirrors the backend, where the two token types are signed with different secrets and are mutually rejected by each other's endpoints. A staff member and a guest session can coexist in the same browser without interfering with each other.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on :5173, proxies `/api` to the backend on :4000 |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run lint` | oxlint |
| `npm run preview` | Preview the production build locally |

## Auth flow

Access tokens live in memory only (never localStorage, to reduce XSS blast radius). The refresh token lives in an httpOnly cookie set by the backend. On load, `AuthContext` silently attempts `/api/auth/refresh` to restore a session; the axios response interceptor (`api/client.ts`) automatically retries a request once after a silent refresh if it gets a 401.

## Role-based UI

`AppLayout` filters the sidebar by the logged-in user's role, and `ProtectedRoute` enforces the same restriction at the route level (redirecting rather than just hiding a link) — but remember the real enforcement is server-side; the frontend restrictions are for UX, not security.

## Guest booking widget

`BookingWidgetPage` is a standalone route (`/book?property=<propertyId>`) with no sidebar and no authentication, meant to be linked from the hotel's marketing site or embedded in an iframe.

## Environment

In development, `vite.config.ts` proxies `/api` to `http://localhost:4000`, so no environment variable is needed locally. For a production build served separately from the API, set `VITE_API_BASE_URL` (see `.env.example`) and update `src/api/client.ts`'s `baseURL` accordingly, or rely on the nginx reverse proxy configured in `nginx.conf` / `docker-compose.yml`.
