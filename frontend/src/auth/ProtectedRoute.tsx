import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { StaffRole } from "../api/types";

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: StaffRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-ink-400 text-sm">
        Loading&hellip;
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && user.role !== "OWNER" && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
