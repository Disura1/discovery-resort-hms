import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useCurrentProperty } from "../lib/useCurrentProperty";
import { reservationsApi } from "../api/endpoints";
import { StatusBadge } from "../components/StatusBadge";
import type { ReservationStatus } from "../api/types";

const STATUS_FILTERS: (ReservationStatus | "ALL")[] = [
  "ALL",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED"
];

export function ReservationsPage() {
  const { propertyId } = useCurrentProperty();
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">("ALL");

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["reservations", propertyId, statusFilter],
    queryFn: () =>
      reservationsApi
        .list(propertyId!, statusFilter === "ALL" ? {} : { status: statusFilter })
        .then((r) => r.data.reservations),
    enabled: !!propertyId
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-800">Reservations</h1>
        <Link
          to="/reservations/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          New reservation
        </Link>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              statusFilter === s
                ? "bg-brand-600 text-white border-brand-600"
                : "border-ink-200 text-ink-600 hover:bg-ink-50"
            }`}
          >
            {s.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-ink-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
              <th className="px-4 py-3 font-medium">Guest</th>
              <th className="px-4 py-3 font-medium">Room</th>
              <th className="px-4 py-3 font-medium">Check-in</th>
              <th className="px-4 py-3 font-medium">Check-out</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && reservations?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-400">
                  No reservations found.
                </td>
              </tr>
            )}
            {reservations?.map((r) => (
              <tr key={r.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50">
                <td className="px-4 py-3 font-medium text-ink-800">{r.guest_name}</td>
                <td className="px-4 py-3 text-ink-600">
                  {r.room_number} <span className="text-ink-400">({r.room_type_name})</span>
                </td>
                <td className="px-4 py-3 text-ink-600">{format(new Date(r.check_in), "d MMM yyyy")}</td>
                <td className="px-4 py-3 text-ink-600">{format(new Date(r.check_out), "d MMM yyyy")}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/reservations/${r.id}`} className="font-medium text-brand-600 hover:text-brand-800">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
