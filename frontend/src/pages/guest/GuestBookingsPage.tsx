import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { guestPortalApi } from "../../api/guestEndpoints";
import { StatusBadge } from "../../components/StatusBadge";

export function GuestBookingsPage() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["guest-bookings"],
    queryFn: () => guestPortalApi.myBookings().then((r) => r.data.bookings)
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink-800">My Bookings</h1>

      {isLoading && <p className="text-sm text-ink-400">Loading…</p>}
      {!isLoading && bookings?.length === 0 && (
        <div className="rounded-lg border border-ink-200 bg-white p-8 text-center">
          <p className="text-sm text-ink-400 mb-3">You don't have any bookings yet.</p>
          <Link to="/guest" className="text-sm font-medium text-brand-600 hover:text-brand-800">
            Book a room →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {bookings?.map((b) => (
          <Link
            key={b.id}
            to={`/guest/bookings/${b.id}`}
            className="block rounded-lg border border-ink-200 bg-white p-4 hover:border-brand-400"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-800">
                  {b.property_name} &middot; Room {b.room_number}
                </p>
                <p className="text-xs text-ink-400">{b.room_type_name}</p>
                <p className="text-sm text-ink-600 mt-1">
                  {format(new Date(b.check_in), "d MMM yyyy")} &rarr; {format(new Date(b.check_out), "d MMM yyyy")}
                </p>
              </div>
              <StatusBadge status={b.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
