import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useCurrentProperty } from "../lib/useCurrentProperty";
import { reservationsApi } from "../api/endpoints";
import { StatusBadge } from "../components/StatusBadge";

export function DashboardPage() {
  const { propertyId, property } = useCurrentProperty();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["reservations", propertyId, today],
    queryFn: () => reservationsApi.list(propertyId!, { from: today, to: today }).then((r) => r.data.reservations),
    enabled: !!propertyId
  });

  const arrivals = reservations?.filter((r) => r.check_in.startsWith(today) && r.status === "CONFIRMED") ?? [];
  const departures = reservations?.filter((r) => r.check_out.startsWith(today) && r.status === "CHECKED_IN") ?? [];
  const inHouse = reservations?.filter((r) => r.status === "CHECKED_IN") ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink-800">{property?.name ?? "Dashboard"}</h1>
        <p className="text-sm text-ink-400">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Arrivals today" value={arrivals.length} />
        <SummaryCard label="Departures today" value={departures.length} />
        <SummaryCard label="Guests in house" value={inHouse.length} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-ink-800 mb-3">Today's arrivals</h2>
        <div className="rounded-lg border border-ink-200 bg-white overflow-hidden">
          {isLoading && <p className="p-4 text-sm text-ink-400">Loading…</p>}
          {!isLoading && arrivals.length === 0 && (
            <p className="p-4 text-sm text-ink-400">No arrivals scheduled for today.</p>
          )}
          {arrivals.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-ink-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-ink-800">{r.guest_name}</p>
                <p className="text-xs text-ink-400">
                  Room {r.room_number} &middot; {r.room_type_name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={r.status} />
                <Link to={`/reservations/${r.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-800">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink-800 mb-3">Today's departures</h2>
        <div className="rounded-lg border border-ink-200 bg-white overflow-hidden">
          {!isLoading && departures.length === 0 && (
            <p className="p-4 text-sm text-ink-400">No departures scheduled for today.</p>
          )}
          {departures.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-ink-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-ink-800">{r.guest_name}</p>
                <p className="text-xs text-ink-400">Room {r.room_number}</p>
              </div>
              <Link to={`/reservations/${r.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-800">
                View folio
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="text-2xl font-semibold text-brand-800">{value}</p>
      <p className="text-xs text-ink-400 mt-1">{label}</p>
    </div>
  );
}
