export function Logo({ variant = "full" }: { variant?: "full" | "mark" }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <circle cx="17" cy="17" r="16" stroke="currentColor" strokeWidth="1.5" className="text-ocean-400" />
        <path
          d="M6 20c3-4 6 4 9 0s6-8 9-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="text-ocean-600"
        />
        <circle cx="17" cy="13" r="2.5" className="fill-sun-400" />
      </svg>
      {variant === "full" && (
        <div className="leading-tight">
          <p className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-ocean-800 tracking-tight">
            Discovery Resort
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-400 -mt-0.5">Guest Portal</p>
        </div>
      )}
    </div>
  );
}