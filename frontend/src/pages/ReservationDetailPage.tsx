import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { uuid } from "../lib/uuid";
import { reservationsApi, foliosApi } from "../api/endpoints";
import { StatusBadge } from "../components/StatusBadge";

export function ReservationDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [chargeDescription, setChargeDescription] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "BANK_TRANSFER">("CASH");

  const { data: reservation } = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => reservationsApi.get(reservationId!).then((r) => r.data.reservation),
    enabled: !!reservationId
  });

  // The folio id is stable for the lifetime of a reservation, so it is
  // resolved once via the dedicated lookup endpoint and cached alongside it.
  const { data: folioId } = useQuery({
    queryKey: ["folio-id", reservationId],
    queryFn: () => foliosApi.getByReservation(reservationId!).then((r) => r.data.folio.id),
    enabled: !!reservationId
  });

  const folioDetail = useQuery({
    queryKey: ["folio", folioId],
    queryFn: () => foliosApi.get(folioId!).then((r) => r.data),
    enabled: !!folioId
  });

  async function refetchAll() {
    await queryClient.invalidateQueries({ queryKey: ["reservation", reservationId] });
    if (folioId) await queryClient.invalidateQueries({ queryKey: ["folio", folioId] });
  }

  async function handleCheckIn() {
    setActionError(null);
    try {
      await reservationsApi.checkIn(reservationId!);
      await refetchAll();
    } catch {
      setActionError("Could not check in this reservation.");
    }
  }

  async function handleCheckOut() {
    setActionError(null);
    try {
      await reservationsApi.checkOut(reservationId!);
      await refetchAll();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error?.message ?? "Could not check out. There may be an outstanding balance."
      );
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this reservation? This cannot be undone.")) return;
    setActionError(null);
    try {
      await reservationsApi.cancel(reservationId!, "CANCELLED");
      await refetchAll();
    } catch (err: any) {
      setActionError(err?.response?.data?.error?.message ?? "Could not cancel this reservation.");
    }
  }

  async function handleAddCharge() {
    if (!folioId || !chargeDescription || !chargeAmount) return;
    await foliosApi.addLineItem(folioId, { description: chargeDescription, amount: Number(chargeAmount) });
    setChargeDescription("");
    setChargeAmount("");
    await queryClient.invalidateQueries({ queryKey: ["folio", folioId] });
  }

  async function handleRecordPayment() {
    if (!folioId || !paymentAmount) return;
    await foliosApi.recordPayment(folioId, {
      method: paymentMethod,
      amount: Number(paymentAmount),
      idempotencyKey: uuid()
    });
    setPaymentAmount("");
    await queryClient.invalidateQueries({ queryKey: ["folio", folioId] });
  }

  if (!reservation) return <p className="text-sm text-ink-400">Loading…</p>;

  const balance = folioDetail.data ? Number(folioDetail.data.folio.balance) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-800">{reservation.guest_name}</h1>
          <p className="text-sm text-ink-400">
            Room {reservation.room_number} &middot; {reservation.room_type_name}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      <div className="rounded-lg border border-ink-200 bg-white p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-ink-400">Check-in</p>
          <p className="font-medium text-ink-800">{format(new Date(reservation.check_in), "d MMM yyyy, HH:mm")}</p>
        </div>
        <div>
          <p className="text-ink-400">Check-out</p>
          <p className="font-medium text-ink-800">{format(new Date(reservation.check_out), "d MMM yyyy, HH:mm")}</p>
        </div>
      </div>

      {actionError && <p className="text-sm text-danger-600">{actionError}</p>}

      <div className="flex gap-3">
        {reservation.status === "CONFIRMED" && (
          <button onClick={handleCheckIn} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
            Check in
          </button>
        )}
        {reservation.status === "CONFIRMED" && (
          <button
            onClick={handleCancel}
            className="rounded-md border border-danger-600 px-4 py-2 text-sm font-medium text-danger-600 hover:bg-danger-100"
          >
            Cancel reservation
          </button>
        )}
        {reservation.status === "CHECKED_IN" && (
          <button
            onClick={handleCheckOut}
            disabled={balance !== null && balance > 0}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-40"
            title={balance && balance > 0 ? "Settle the outstanding balance before checking out" : ""}
          >
            Check out
          </button>
        )}
      </div>

      {folioDetail.data && (
        <div className="rounded-lg border border-ink-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
            <h2 className="text-sm font-semibold text-ink-800">Folio</h2>
            <p className={`text-sm font-semibold ${balance && balance > 0 ? "text-warn-600" : "text-brand-800"}`}>
              Balance: Rs {balance?.toLocaleString()}
            </p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {folioDetail.data.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-ink-100">
                  <td className="px-5 py-2 text-ink-600">{item.description}</td>
                  <td className="px-5 py-2 text-right text-ink-800">Rs {Number(item.amount).toLocaleString()}</td>
                </tr>
              ))}
              {folioDetail.data.payments.map((p) => (
                <tr key={p.id} className="border-b border-ink-100 bg-brand-50/40">
                  <td className="px-5 py-2 text-brand-800">
                    Payment ({p.method.toLowerCase()}) &middot; {p.status}
                  </td>
                  <td className="px-5 py-2 text-right text-brand-800">-Rs {Number(p.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-4 p-5 border-t border-ink-200">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-400 uppercase">Post a charge</p>
              <input
                value={chargeDescription}
                onChange={(e) => setChargeDescription(e.target.value)}
                placeholder="Description"
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
              />
              <input
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                placeholder="Amount"
                type="number"
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddCharge}
                className="rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-50"
              >
                Add charge
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-400 uppercase">Record a payment</p>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
              </select>
              <input
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Amount"
                type="number"
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
              />
              <button
                onClick={handleRecordPayment}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
              >
                Record payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
