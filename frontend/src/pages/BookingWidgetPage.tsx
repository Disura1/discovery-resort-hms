import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { roomsApi, reservationsApi } from "../api/endpoints";
import type { AvailableRoom } from "../api/types";

export function BookingWidgetPage() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get("property") ?? "";

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState<AvailableRoom[] | null>(null);
  const [selected, setSelected] = useState<AvailableRoom | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    if (!propertyId || !checkIn || !checkOut) return;
    setBusy(true);
    setError(null);
    try {
      const res = await roomsApi.availability(propertyId, new Date(checkIn).toISOString(), new Date(checkOut).toISOString());
      setRooms(res.data.rooms);
    } catch {
      setError("Could not search availability right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function book() {
    if (!selected || !guestName) return;
    setBusy(true);
    setError(null);
    try {
      const res = await reservationsApi.create({
        propertyId,
        roomId: selected.room_id,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        guest: { fullName: guestName, email: guestEmail || undefined }
      });
      setConfirmation(res.data.reservation.id);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError("Sorry, that room was just booked. Please choose another.");
        setSelected(null);
      } else {
        setError("We could not complete your booking. Please check your details and try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!propertyId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-400 text-sm">
        Missing property reference. This booking widget should be linked with a ?property= parameter.
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold text-brand-800">Booking confirmed</h1>
          <p className="text-sm text-ink-600">
            Thank you, {guestName}. Your reservation is confirmed. A confirmation email will be sent to{" "}
            {guestEmail || "the address you provided"}.
          </p>
          <p className="text-xs text-ink-400">Reference: {confirmation}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <p className="text-sm text-ink-400">Discovery-Resort-Muwanthanna</p>
          <h1 className="text-xl font-semibold text-brand-800">Book your stay</h1>
        </div>

        <div className="rounded-lg border border-ink-200 bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">Check-in</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">Check-out</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <button
            onClick={search}
            disabled={!checkIn || !checkOut || busy}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            Search rooms
          </button>
        </div>

        {error && <p className="text-sm text-danger-600 text-center">{error}</p>}

        {rooms?.map((room) => (
          <div key={room.room_id} className={`rounded-lg border p-4 ${selected?.room_id === room.room_id ? "border-brand-600" : "border-ink-200"} bg-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-800">{room.room_type_name}</p>
                <p className="text-xs text-ink-400">Sleeps {room.max_occupancy} &middot; Free cancellation up to 24h before check-in</p>
                <p className="text-sm text-ink-800 mt-1">Rs {Number(room.base_rate).toLocaleString()} / night</p>
              </div>
              <button
                onClick={() => setSelected(room)}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
              >
                Select
              </button>
            </div>
          </div>
        ))}

        {selected && (
          <div className="rounded-lg border border-ink-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink-800">Your details</h2>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
            />
            <input
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
            />
            <button
              onClick={book}
              disabled={!guestName || busy}
              className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {busy ? "Booking…" : "Confirm and book"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
