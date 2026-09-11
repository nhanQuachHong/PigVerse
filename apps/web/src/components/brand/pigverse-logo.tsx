import Link from "next/link";

export function PigverseLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="Pigverse home" className="pv-logo" href="/">
      <span aria-hidden="true" className="pv-logo__mark">
        <svg fill="none" viewBox="0 0 48 48">
          <path d="M11 13 7 6l10 4m20 3 4-7-10 4" />
          <path d="M8 24C8 13 15 8 24 8s16 5 16 16-7 17-16 17S8 35 8 24Z" />
          <ellipse cx="24" cy="28" rx="8" ry="6" />
          <path d="M21 27v2m6-2v2M16 22h.01M32 22h.01" />
        </svg>
      </span>
      <span className="pv-logo__text">
        Pigverse
        {!compact && <small>Small pigs. Big adventures.</small>}
      </span>
    </Link>
  );
}
