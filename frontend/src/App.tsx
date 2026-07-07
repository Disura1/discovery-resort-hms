import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";

import { GuestAuthProvider } from "./guestAuth/GuestAuthContext";
import { GuestProtectedRoute } from "./guestAuth/GuestProtectedRoute";

import { AppLayout } from "./components/AppLayout";
import { GuestLayout } from "./components/GuestLayout";

import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { GuestsPage } from "./pages/GuestsPage";
import { NewReservationPage } from "./pages/NewReservationPage";
import { ReservationDetailPage } from "./pages/ReservationDetailPage";
import { HousekeepingPage } from "./pages/HousekeepingPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { BookingWidgetPage } from "./pages/BookingWidgetPage";

import { GuestLoginPage } from "./pages/guest/GuestLoginPage";
import { GuestBrowseRoomsPage } from "./pages/guest/GuestBrowseRoomsPage";
import { GuestBookingsPage } from "./pages/guest/GuestBookingsPage";
import { GuestBookingDetailPage } from "./pages/guest/GuestBookingDetailPage";
import { GuestFeedbackPage } from "./pages/guest/GuestFeedbackPage";
import { GuestRegisterPage } from "./pages/guest/GuestRegisterPage";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

function StaffAuthRoutes() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function GuestAuthRoutes() {
  return (
    <GuestAuthProvider>
      <Outlet />
    </GuestAuthProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/book" element={<BookingWidgetPage />} />

          {/* Staff routes */}
          <Route element={<StaffAuthRoutes />}>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />

                <Route
                  element={
                    <ProtectedRoute allowedRoles={["FRONT_DESK", "MANAGER"]} />
                  }
                >
                  <Route path="/reservations" element={<ReservationsPage />} />
                  <Route
                    path="/reservations/new"
                    element={<NewReservationPage />}
                  />
                  <Route path="/guests" element={<GuestsPage />} />
                </Route>

                <Route
                  path="/reservations/:reservationId"
                  element={<ReservationDetailPage />}
                />

                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "HOUSEKEEPING",
                        "FRONT_DESK",
                        "MANAGER"
                      ]}
                    />
                  }
                >
                  <Route path="/housekeeping" element={<HousekeepingPage />} />
                </Route>

                <Route
                  element={
                    <ProtectedRoute allowedRoles={["MANAGER", "ACCOUNTANT"]} />
                  }
                >
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>

                <Route
                  element={<ProtectedRoute allowedRoles={["MANAGER"]} />}
                >
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          {/* Guest routes */}
          <Route element={<GuestAuthRoutes />}>
            <Route path="/guest/login" element={<GuestLoginPage />} />
            <Route path="/guest/register" element={<GuestRegisterPage />} />

            <Route element={<GuestProtectedRoute />}>
              <Route element={<GuestLayout />}>
                <Route path="/guest" element={<GuestBrowseRoomsPage />} />
                <Route path="/guest/bookings" element={<GuestBookingsPage />} />
                <Route
                  path="/guest/bookings/:reservationId"
                  element={<GuestBookingDetailPage />}
                />
                <Route path="/guest/feedback" element={<GuestFeedbackPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}