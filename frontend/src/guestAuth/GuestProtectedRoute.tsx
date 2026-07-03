import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useGuestAuth } from "./GuestAuthContext";

export function GuestProtectedRoute() {
  const { guest, isLoading } = useGuestAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-ink-400 text-sm">Loading&hellip;</div>;
  }

  if (!guest) {
    return <Navigate to="/guest/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
