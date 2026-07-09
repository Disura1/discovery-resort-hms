import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { BedDouble, CalendarCheck, MessageSquareHeart, LogOut } from "lucide-react";
import { useGuestAuth } from "../guestAuth/GuestAuthContext";
import { Logo } from "./Logo";
import { GuestFooter } from "./GuestFooter";

const NAV_ITEMS = [
  { to: "/guest", label: "Book a room", end: true, icon: BedDouble },
  { to: "/guest/bookings", label: "My Bookings", icon: CalendarCheck },
  { to: "/guest/feedback", label: "Feedback", icon: MessageSquareHeart }
];

export function GuestLayout() {
  const { guest, logout } = useGuestAuth();

  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, end, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "bg-ocean-100 text-ocean-800" : "text-ink-600 hover:bg-ink-100"
                  )
                }
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
            {guest && (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-danger-100 hover:text-danger-600 transition-colors"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <Outlet />
      </main>

      <GuestFooter />
    </div>
  );
}