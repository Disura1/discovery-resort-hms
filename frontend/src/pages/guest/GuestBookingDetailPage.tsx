import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { guestPortalApi } from "../../api/guestEndpoints";
import { StatusBadge } from "../../components/StatusBadge";

export function GuestBookingDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const { data } = useQuery({
    queryKey: ["guest-booking", reservationId],
    queryFn: () => guestPortalApi.bookingDetail(reservationId!).then((r) => r.data),
    enabled: !!reservationId
  });

  async function handleCancel() {
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    setCancelling(true);
    setError(null);
    try {
      await guestPortalApi.cancelBooking(reservationId!);
      await queryClient.invalidateQueries({ queryKey: ["guest-booking", reservationId] });
      await queryClient.invalidateQueries({ queryKey: ["guest-bookings"] });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? "Could not cancel this booking.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleDownloadInvoice() {
    setDownloadingInvoice(true);
    setError(null);
    try {
      const res = await guestPortalApi.downloadInvoice(reservationId!);
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `invoice-${reservationId!.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Could not download the invoice. It may not be available yet.");
    } finally {
      setDownloadingInvoice(false);
    }
  }

  if (!data) return <p className="text-sm text-ink-400">Loading…</p>;

  const { reservation, folio, lineItems, payments } = data;
  const balance = folio ? Number(folio.balance) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/guest/bookings" className="text-sm text-brand-600 hover:text-brand-800">
        ← Back to My Bookings
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-800">
            Room {reservation.room_number} &middot; {reservation.room_type_name}
          </h1>
          <p className="text-sm text-ink-400">
            {format(new Date(reservation.check_in), "d MMM yyyy")} &rarr; {format(new Date(reservation.check_out), "d MMM yyyy")}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}

      <div className="flex gap-3">
        {reservation.status === "CONFIRMED" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded-md border border-danger-600 px-4 py-2 text-sm font-medium text-danger-600 hover:bg-danger-100 disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel booking"}
          </button>
        )}
        {folio && (
          <button
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            className="rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 disabled:opacity-50"
          >
            {downloadingInvoice ? "Preparing…" : "Download invoice"}
          </button>
        )}
        {reservation.status === "CHECKED_OUT" && (
          <Link
            to={`/guest/feedback?reservation=${reservation.id}`}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Leave feedback
          </Link>
        )}
      </div>

      {folio && (
        <div className="rounded-lg border border-ink-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
            <h2 className="text-sm font-semibold text-ink-800">Charges</h2>
            <p className={`text-sm font-semibold ${balance && balance > 0 ? "text-warn-600" : "text-brand-800"}`}>
              Balance: Rs {balance?.toLocaleString()}
            </p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} className="border-b border-ink-100">
                  <td className="px-5 py-2 text-ink-600">{item.description}</td>
                  <td className="px-5 py-2 text-right text-ink-800">Rs {Number(item.amount).toLocaleString()}</td>
                </tr>
              ))}
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-ink-100 bg-brand-50/40">
                  <td className="px-5 py-2 text-brand-800">
                    Payment ({p.method.toLowerCase()}) &middot; {p.status}
                  </td>
                  <td className="px-5 py-2 text-right text-brand-800">-Rs {Number(p.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
