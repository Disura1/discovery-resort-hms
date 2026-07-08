import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { useGuestAuth } from "../guestAuth/GuestAuthContext";

const NAV_ITEMS = [
  { to: "/guest", label: "Book a room", end: true },
  { to: "/guest/bookings", label: "My Bookings" },
  { to: "/guest/feedback", label: "Feedback" }
];

export function GuestLayout() {
  const { guest, logout } = useGuestAuth();

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-400">Discovery-Resort-Muwanthanna</p>
            <p className="font-semibold text-brand-800">Guest Portal</p>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-50"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-600 hidden sm:inline">{guest?.fullName}</span>
            <button
              onClick={() => logout()}
              className="rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
