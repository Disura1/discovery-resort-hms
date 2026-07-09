import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { guestPortalApi } from "../../api/guestEndpoints";
import { guestApi } from "../../api/guestClient";
import type { AvailableRoom } from "../../api/types";

interface PublicProperty {
  id: string;
  name: string;
  address: string;
  currency: string;
}

export function GuestBrowseRoomsPage() {
  const navigate = useNavigate();

  const [propertyId, setPropertyId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState<AvailableRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function loadDiscoveryResort() {
      try {
        const res = await guestApi.get<{ properties: PublicProperty[] }>("/properties/public");

        const discoveryResort =
          res.data.properties.find((p) =>
            p.name.toLowerCase().includes("discovery resort")
          ) ?? res.data.properties[0];

        if (discoveryResort) {
          setPropertyId(discoveryResort.id);
        } else {
          setError("Discovery Resort property was not found.");
        }
      } catch {
        setError("Could not load hotel details. Please try again.");
      }
    }

    loadDiscoveryResort();
  }, []);

  async function search() {
    if (!propertyId || !checkIn || !checkOut) return;

    setBusy(true);
    setError(null);

    try {
      const res = await guestPortalApi.availability(
        propertyId,
        new Date(checkIn).toISOString(),
        new Date(checkOut).toISOString()
      );

      setRooms(res.data.rooms);
    } catch {
      setError("Could not search availability right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function book(room: AvailableRoom) {
    if (!propertyId || !checkIn || !checkOut) return;

    setBusy(true);
    setError(null);

    try {
      const res = await guestPortalApi.createBooking({
        propertyId,
        roomId: room.room_id,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString()
      });

      navigate(`/guest/bookings/${res.data.reservation.id}`);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError("Sorry, that room was just booked by someone else. Please pick another.");
        search();
      } else {
        setError("Could not complete your booking. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink-800">Book a room</h1>

      <div className="rounded-lg border border-ink-200 bg-white p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-800 mb-1">
            Hotel
          </label>
          <div className="w-full rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700">
            Discovery Resort
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">
              Check-in
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">
              Check-out
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={search}
          disabled={!propertyId || !checkIn || !checkOut || busy}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {busy ? "Searching..." : "Search rooms"}
        </button>
      </div>

      {error && <p className="text-sm text-danger-600 text-center">{error}</p>}

      {rooms && rooms.length === 0 && (
        <p className="text-sm text-ink-400 text-center">
          No rooms available for these dates.
        </p>
      )}

      {rooms?.map((room) => (
        <div
          key={room.room_id}
          className="rounded-lg border border-ink-200 bg-white p-4 flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-ink-800">{room.room_type_name}</p>
            <p className="text-xs text-ink-400">
              Sleeps {room.max_occupancy} &middot; Free cancellation up to 24h before check-in
            </p>
            <p className="text-sm text-ink-800 mt-1">
              Rs {Number(room.base_rate).toLocaleString()} / night
            </p>
          </div>

          <button
            type="button"
            onClick={() => book(room)}
            disabled={busy}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            Book
          </button>
        </div>
      ))}
    </div>
  );
}