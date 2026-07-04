import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import type { StaffRole } from "../api/types";

interface NavItem {
  to: string;
  label: string;
  roles?: StaffRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/reservations", label: "Reservations", roles: ["FRONT_DESK", "MANAGER"] },
  { to: "/guests", label: "Guests", roles: ["FRONT_DESK", "MANAGER"] },
  { to: "/housekeeping", label: "Housekeeping", roles: ["HOUSEKEEPING", "FRONT_DESK", "MANAGER"] },
  { to: "/reports", label: "Reports", roles: ["MANAGER", "ACCOUNTANT"] },
  { to: "/settings", label: "Settings", roles: ["MANAGER"] }
];

export function AppLayout() {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || user?.role === "OWNER" || item.roles.includes(user!.role)
  );

  return (
    <div className="flex h-screen bg-ink-50">
      <aside className="w-56 shrink-0 border-r border-ink-200 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-ink-200">
          <p className="text-sm text-ink-400">Discovery-Resort-Muwanthanna</p>
          <p className="font-semibold text-brand-800">Staff Console</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-50"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-ink-200">
          <p className="text-sm font-medium text-ink-800">{user?.fullName}</p>
          <p className="text-xs text-ink-400 mb-3">{user?.role.replace("_", " ")}</p>
          <button
            onClick={() => logout()}
            className="w-full rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-50"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
