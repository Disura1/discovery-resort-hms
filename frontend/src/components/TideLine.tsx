export function TideLine({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 12" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        d="M0 6c8-6 16 6 24 0s16-6 24 0 16 6 24 0 16-6 24 0 16 6 24 0 16-6 24 0 16 6 24 0 16-6 24 0"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}