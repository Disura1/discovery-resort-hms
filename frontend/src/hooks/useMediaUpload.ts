import { useState, useCallback } from "react";
import { mediaApi, type MediaItem } from "../api/mediaEndpoints";

export function useMediaUpload(entityType: string, entityId: string) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await mediaApi.list(entityType, entityId);
    setItems(res.data.media);
  }, [entityType, entityId]);

  const upload = useCallback(
    async (file: File, isPublic = false) => {
      setError(null);
      setProgress(0);
      try {
        const media = await mediaApi.upload(file, entityType, entityId, isPublic, setProgress);
        setItems((prev) => [...prev, media]);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message ?? "Upload failed. Please try again.");
      } finally {
        setProgress(null);
      }
    },
    [entityType, entityId]
  );

  const remove = useCallback(async (mediaId: string) => {
    await mediaApi.remove(mediaId);
    setItems((prev) => prev.filter((m) => m.id !== mediaId));
  }, []);

  return { items, load, upload, remove, progress, error };
}