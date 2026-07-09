import { Users, ShieldCheck } from "lucide-react";
import { RoomTypeImage } from "./RoomTypeImage";
import type { AvailableRoom } from "../api/types";

export function RoomTypeCard({ room, busy, onBook }: { room: AvailableRoom; busy: boolean; onBook: () => void }) {
  return (
    <div className="guest-card rounded-2xl border border-ink-200 bg-white overflow-hidden">
      <RoomTypeImage roomTypeId={room.room_type_id} alt={room.room_type_name} />
      <div className="p-4">
        <p className="font-[family-name:var(--font-display)] text-lg text-ocean-800">{room.room_type_name}</p>
        <div className="flex items-center gap-1.5 text-xs text-ink-400 mt-1">
          <Users size={13} /> Sleeps {room.max_occupancy}
          <span className="mx-1">&middot;</span>
          <ShieldCheck size={13} /> Free cancellation, 24h notice
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-ink-800">
            <span className="text-lg font-semibold">Rs {Number(room.base_rate).toLocaleString()}</span>
            <span className="text-xs text-ink-400"> / night</span>
          </p>
          <button
            onClick={onBook}
            disabled={busy}
            className="rounded-full bg-ocean-600 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-800 transition-colors disabled:opacity-50"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
}