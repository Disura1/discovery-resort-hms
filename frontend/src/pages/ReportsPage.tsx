import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useCurrentProperty } from "../lib/useCurrentProperty";
import { reportsApi } from "../api/endpoints";

export function ReportsPage() {
  const { propertyId } = useCurrentProperty();
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const occupancy = useQuery({
    queryKey: ["report-occupancy", propertyId, from, to],
    queryFn: () => reportsApi.occupancy(propertyId!, from, to).then((r) => r.data as any),
    enabled: !!propertyId
  });

  const revenue = useQuery({
    queryKey: ["report-revenue", propertyId, from, to],
    queryFn: () => reportsApi.revenue(propertyId!, from, to).then((r) => r.data as any),
    enabled: !!propertyId
  });

  const adrRevpar = useQuery({
    queryKey: ["report-adr", propertyId, from, to],
    queryFn: () => reportsApi.adrRevpar(propertyId!, from, to).then((r) => r.data as any),
    enabled: !!propertyId
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink-800">Reports</h1>

      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-ink-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-ink-200 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-400 mb-1">Total revenue</p>
          <p className="text-2xl font-semibold text-brand-800">
            Rs {revenue.data?.totalRevenue?.toLocaleString() ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-400 mb-1">ADR (average daily rate)</p>
          <p className="text-2xl font-semibold text-brand-800">Rs {adrRevpar.data?.adr?.toLocaleString() ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-400 mb-1">RevPAR</p>
          <p className="text-2xl font-semibold text-brand-800">Rs {adrRevpar.data?.revPar?.toLocaleString() ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-lg border border-ink-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-200">
          <h2 className="text-sm font-semibold text-ink-800">Daily occupancy</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-400 border-b border-ink-200">
              <th className="px-5 py-2 font-medium">Date</th>
              <th className="px-5 py-2 font-medium">Occupied rooms</th>
              <th className="px-5 py-2 font-medium">Occupancy rate</th>
            </tr>
          </thead>
          <tbody>
            {occupancy.data?.occupancy?.map((row: any) => (
              <tr key={row.date} className="border-b border-ink-100 last:border-0">
                <td className="px-5 py-2 text-ink-600">{format(new Date(row.date), "d MMM yyyy")}</td>
                <td className="px-5 py-2 text-ink-600">
                  {row.occupiedRooms} / {row.totalRooms}
                </td>
                <td className="px-5 py-2 text-ink-800 font-medium">{row.occupancyRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
