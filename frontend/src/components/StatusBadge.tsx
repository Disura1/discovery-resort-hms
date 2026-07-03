import clsx from "clsx";

const STYLES: Record<string, string> = {
  AVAILABLE: "bg-brand-50 text-brand-800",
  CONFIRMED: "bg-brand-50 text-brand-800",
  SUCCEEDED: "bg-brand-50 text-brand-800",
  INSPECTED: "bg-brand-50 text-brand-800",
  OCCUPIED: "bg-warn-100 text-warn-600",
  CHECKED_IN: "bg-warn-100 text-warn-600",
  PENDING: "bg-warn-100 text-warn-600",
  DIRTY: "bg-warn-100 text-warn-600",
  CHECKED_OUT: "bg-ink-100 text-ink-600",
  CANCELLED: "bg-danger-100 text-danger-600",
  NO_SHOW: "bg-danger-100 text-danger-600",
  FAILED: "bg-danger-100 text-danger-600",
  OUT_OF_ORDER: "bg-danger-100 text-danger-600"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status] ?? "bg-ink-100 text-ink-600"
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
