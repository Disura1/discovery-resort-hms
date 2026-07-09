import { api } from "./client";

export interface MediaItem {
  id: string;
  originalName: string;
  mimeType: string;
  kind: "IMAGE" | "VIDEO" | "DOCUMENT";
  sizeBytes: number;
  isPublic: boolean;
  url: string;
  createdAt: string;
}

export const mediaApi = {
  list: (entityType: string, entityId: string) =>
    api.get<{ media: MediaItem[] }>("/media", { params: { entityType, entityId } }),

  remove: (mediaId: string) => api.delete(`/media/${mediaId}`),

  /**
   * Full upload flow: request a presigned URL, PUT the file straight to
   * the bucket, then confirm — the file's bytes never pass through our
   * Express server.
   */
  async upload(
    file: File,
    entityType: string,
    entityId: string,
    isPublic: boolean,
    onProgress?: (pct: number) => void
  ): Promise<MediaItem> {
    const { data } = await api.post<{ uploadUrl: string; mediaId: string }>("/media/uploads", {
      entityType,
      entityId,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      isPublic
    });

    await uploadWithProgress(data.uploadUrl, file, onProgress);

    const { data: confirmed } = await api.post<{ media: MediaItem }>("/media/uploads/confirm", {
      mediaId: data.mediaId
    });
    return confirmed.media;
  }
};

function uploadWithProgress(url: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}