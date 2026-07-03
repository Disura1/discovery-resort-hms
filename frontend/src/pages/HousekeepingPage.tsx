import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentProperty } from "../lib/useCurrentProperty";
import { housekeepingApi, roomsApi } from "../api/endpoints";
import { StatusBadge } from "../components/StatusBadge";
import type { RoomStatus } from "../api/types";

const STATUS_OPTIONS: RoomStatus[] = ["AVAILABLE", "OCCUPIED", "DIRTY", "INSPECTED", "OUT_OF_ORDER"];

export function HousekeepingPage() {
  const { propertyId } = useCurrentProperty();
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["housekeeping-board", propertyId],
    queryFn: () => housekeepingApi.board(propertyId!).then((r) => r.data.rooms),
    enabled: !!propertyId,
    refetchInterval: 15000
  });

  async function updateStatus(roomId: string, status: RoomStatus) {
    await roomsApi.updateRoomStatus(roomId, status);
    await queryClient.invalidateQueries({ queryKey: ["housekeeping-board", propertyId] });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink-800">Housekeeping board</h1>
      <div className="grid grid-cols-3 gap-4">
        {isLoading && <p className="text-sm text-ink-400">Loading…</p>}
        {rooms?.map((room) => (
          <div key={room.id} className="rounded-lg border border-ink-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-800">Room {room.room_number}</p>
                <p className="text-xs text-ink-400">{room.room_type_name}</p>
              </div>
              <StatusBadge status={room.status} />
            </div>
            <select
              value={room.status}
              onChange={(e) => updateStatus(room.id, e.target.value as RoomStatus)}
              className="w-full rounded-md border border-ink-200 px-2 py-1.5 text-xs"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
