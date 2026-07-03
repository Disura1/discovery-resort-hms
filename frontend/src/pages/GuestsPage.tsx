import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";

interface GuestSearchResult {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface GuestDetail extends GuestSearchResult {
  stayHistory: Array<{
    id: string;
    check_in: string;
    check_out: string;
    status: string;
    room_number: string;
    room_type_name: string;
  }>;
}

export function GuestsPage() {
  const [term, setTerm] = useState("");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  const { data: results, isFetching } = useQuery({
    queryKey: ["guest-search", term],
    queryFn: () => api.get<{ guests: GuestSearchResult[] }>("/guests/search", { params: { q: term } }).then((r) => r.data.guests),
    enabled: term.length >= 2
  });

  const { data: detail } = useQuery({
    queryKey: ["guest-detail", selectedGuestId],
    queryFn: () =>
      api.get<{ guest: GuestSearchResult; stayHistory: GuestDetail["stayHistory"] }>(`/guests/${selectedGuestId}`).then((r) => ({
        ...r.data.guest,
        stayHistory: r.data.stayHistory
      })),
    enabled: !!selectedGuestId
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink-800">Guests</h1>

      <div className="max-w-md">
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setSelectedGuestId(null);
          }}
          placeholder="Search by name, email, or phone…"
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
        />
      </div>

      {term.length >= 2 && (
        <div className="rounded-lg border border-ink-200 bg-white overflow-hidden max-w-md">
          {isFetching && <p className="p-4 text-sm text-ink-400">Searching…</p>}
          {!isFetching && results?.length === 0 && <p className="p-4 text-sm text-ink-400">No guests found.</p>}
          {results?.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGuestId(g.id)}
              className={`block w-full text-left px-4 py-3 border-b border-ink-100 last:border-0 hover:bg-ink-50 ${
                selectedGuestId === g.id ? "bg-brand-50" : ""
              }`}
            >
              <p className="text-sm font-medium text-ink-800">{g.full_name}</p>
              <p className="text-xs text-ink-400">{[g.email, g.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
            </button>
          ))}
        </div>
      )}

      {detail && (
        <div className="rounded-lg border border-ink-200 bg-white overflow-hidden max-w-2xl">
          <div className="px-5 py-4 border-b border-ink-200">
            <h2 className="text-sm font-semibold text-ink-800">{detail.full_name}</h2>
            <p className="text-xs text-ink-400">{[detail.email, detail.phone].filter(Boolean).join(" · ")}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 border-b border-ink-200">
                <th className="px-5 py-2 font-medium">Stay</th>
                <th className="px-5 py-2 font-medium">Room</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {detail.stayHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-center text-ink-400">
                    No previous stays.
                  </td>
                </tr>
              )}
              {detail.stayHistory.map((stay) => (
                <tr key={stay.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-5 py-2 text-ink-600">
                    {format(new Date(stay.check_in), "d MMM yyyy")} &rarr; {format(new Date(stay.check_out), "d MMM yyyy")}
                  </td>
                  <td className="px-5 py-2 text-ink-600">
                    {stay.room_number} ({stay.room_type_name})
                  </td>
                  <td className="px-5 py-2">
                    <StatusBadge status={stay.status} />
                  </td>
                  <td className="px-5 py-2 text-right">
                    <Link to={`/reservations/${stay.id}`} className="font-medium text-brand-600 hover:text-brand-800">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
