import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarRange } from "lucide-react";
import { guestPortalApi } from "../../api/guestEndpoints";
import { guestApi } from "../../api/guestClient";
import type { AvailableRoom } from "../../api/types";
import { RoomTypeCard } from "../../components/RoomTypeCard";
import { RoomCardSkeleton } from "../../components/RoomCardSkeleton";
import { TideLine } from "../../components/TideLine";

interface PublicProperty {
  id: string;
  name: string;
  address: string;
  currency: string;
}

function ResortHero() {
  return (
    <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-ocean-800 via-ocean-600 to-brand-600">
      <svg
        className="absolute inset-0 w-full h-full opacity-25"
        viewBox="0 0 400 160"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <circle cx="330" cy="30" r="22" fill="#E8A33D" />
        <path d="M0 110 Q 50 90 100 110 T 200 110 T 300 110 T 400 110 V160 H0 Z" fill="#0F4C68" opacity="0.6" />
        <path d="M0 130 Q 50 115 100 130 T 200 130 T 300 130 T 400 130 V160 H0 Z" fill="#085041" opacity="0.7" />
      </svg>
      <div className="relative px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-sun-400 text-xs uppercase tracking-[0.18em] font-medium mb-2">Welcome back</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-white max-w-md leading-tight">
          Find your stretch of coastline
        </h1>
        <TideLine className="w-28 h-3 text-sun-400 mt-4" />
      </div>
    </div>
  );
}

export function GuestBrowseRoomsPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState<AvailableRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    guestApi.get<{ properties: PublicProperty[] }>("/properties/public").then((res) => {
      setProperties(res.data.properties);
      if (res.data.properties.length === 1) setPropertyId(res.data.properties[0].id);
    });
  }, []);

  async function search() {
    if (!propertyId || !checkIn || !checkOut) return;
    setBusy(true);
    setError(null);
    try {
      const res = await guestPortalApi.availability(propertyId, new Date(checkIn).toISOString(), new Date(checkOut).toISOString());
      setRooms(res.data.rooms);
    } catch {
      setError("Could not search availability right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function book(room: AvailableRoom) {
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
    <div>
      <ResortHero />

      <div className="rounded-2xl border border-ink-200 bg-white p-5 space-y-4 shadow-sm">
        {properties.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">Hotel</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            >
              <option value="">Select a hotel…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-ink-800 mb-1">
              <CalendarRange size={14} /> Check-in
            </label>
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-ink-800 mb-1">
              <CalendarRange size={14} /> Check-out
            </label>
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <button
          onClick={search}
          disabled={!propertyId || !checkIn || !checkOut || busy}
          className="w-full rounded-full bg-ocean-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-ocean-800 transition-colors disabled:opacity-50"
        >
          Search rooms
        </button>
      </div>

      {error && <p className="text-sm text-danger-600 text-center mt-6">{error}</p>}

      {busy && !rooms && (
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <RoomCardSkeleton /><RoomCardSkeleton />
        </div>
      )}

      {rooms && rooms.length === 0 && (
        <p className="text-sm text-ink-400 text-center mt-8">No rooms available for these dates — try a different range.</p>
      )}

      {rooms && rooms.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          {rooms.map((room) => (
            <RoomTypeCard key={room.room_id} room={room} busy={busy} onBook={() => book(room)} />
          ))}
        </div>
      )}
    </div>
  );
}