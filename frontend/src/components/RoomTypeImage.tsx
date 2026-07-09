import { useEffect, useState } from "react";
import { Waves } from "lucide-react";
import { mediaApi, type MediaItem } from "../api/mediaEndpoints";

export function RoomTypeImage({ roomTypeId, alt }: { roomTypeId: string; alt: string }) {
  const [photo, setPhoto] = useState<MediaItem | null | undefined>(undefined);

  useEffect(() => {
    mediaApi
      .list("ROOM_TYPE", roomTypeId)
      .then((res) => setPhoto(res.data.media.find((m) => m.kind === "IMAGE") ?? null))
      .catch(() => setPhoto(null));
  }, [roomTypeId]);

  if (photo === undefined) return <div className="guest-skeleton h-44 w-full" />;

  if (photo === null) {
    return (
      <div className="h-44 w-full bg-gradient-to-br from-ocean-100 via-ocean-200 to-brand-100 flex items-center justify-center">
        <Waves className="text-ocean-600/50" size={32} strokeWidth={1.5} />
      </div>
    );
  }

  return <img src={photo.url} alt={alt} className="h-44 w-full object-cover" loading="lazy" />;
}