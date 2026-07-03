import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentProperty } from "../lib/useCurrentProperty";
import { roomsApi, reservationsApi } from "../api/endpoints";
import type { AvailableRoom } from "../api/types";

export function NewReservationPage() {
  const { propertyId } = useCurrentProperty();
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState<AvailableRoom[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function searchAvailability() {
    if (!propertyId || !checkIn || !checkOut) return;
    setSearching(true);
    setError(null);
    setSelectedRoom(null);
    try {
      const res = await roomsApi.availability(
        propertyId,
        new Date(checkIn).toISOString(),
        new Date(checkOut).toISOString()
      );
      setRooms(res.data.rooms);
    } catch {
      setError("Could not search availability. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function submitBooking() {
    if (!propertyId || !selectedRoom || !guestName) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await reservationsApi.create({
        propertyId,
        roomId: selectedRoom.room_id,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        guest: { fullName: guestName, email: guestEmail || undefined, phone: guestPhone || undefined }
      });
      navigate(`/reservations/${res.data.reservation.id}`);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError("This room was just booked by someone else. Please pick a different room.");
        setSelectedRoom(null);
      } else {
        setError("Could not create the reservation. Please check the details and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-ink-800">New reservation</h1>

      <div className="rounded-lg border border-ink-200 bg-white p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">Check-in</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">Check-out</label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={searchAvailability}
          disabled={!checkIn || !checkOut || searching}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search availability"}
        </button>
      </div>

      {rooms && (
        <div className="rounded-lg border border-ink-200 bg-white overflow-hidden">
          {rooms.length === 0 && <p className="p-4 text-sm text-ink-400">No rooms available for these dates.</p>}
          {rooms.map((room) => (
            <button
              key={room.room_id}
              onClick={() => setSelectedRoom(room)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left border-b border-ink-100 last:border-0 hover:bg-ink-50 ${
                selectedRoom?.room_id === room.room_id ? "bg-brand-50" : ""
              }`}
            >
              <div>
                <p className="text-sm font-medium text-ink-800">
                  {room.room_type_name} &middot; Room {room.room_number}
                </p>
                <p className="text-xs text-ink-400">Sleeps {room.max_occupancy}</p>
              </div>
              <p className="text-sm font-medium text-ink-800">Rs {Number(room.base_rate).toLocaleString()} / night</p>
            </button>
          ))}
        </div>
      )}

      {selectedRoom && (
        <div className="rounded-lg border border-ink-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink-800">Guest details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-ink-800 mb-1">Full name</label>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
                placeholder="Jayani Silva"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">Email (optional)</label>
              <input
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">Phone (optional)</label>
              <input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <button
            onClick={submitBooking}
            disabled={!guestName || submitting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {submitting ? "Booking…" : "Confirm booking"}
          </button>
        </div>
      )}
    </div>
  );
}
