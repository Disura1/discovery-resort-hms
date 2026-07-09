export function RoomCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white overflow-hidden">
      <div className="guest-skeleton h-44 w-full" />
      <div className="p-4 space-y-2">
        <div className="guest-skeleton h-4 w-2/3 rounded" />
        <div className="guest-skeleton h-3 w-1/2 rounded" />
        <div className="guest-skeleton h-8 w-full rounded-lg mt-3" />
      </div>
    </div>
  );
}