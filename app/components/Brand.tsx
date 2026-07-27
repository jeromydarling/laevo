import { Link } from "react-router";

/**
 * The Laevo mark: an ear of wheat.
 *
 * Kept from the first sketch of this product because it says the right thing —
 * grain is the oldest picture of enough food, and an ear of wheat is a stalk
 * holding its grains up. Laevo is Latin for lift up.
 *
 * Drawn in currentColor so it works on the cream header and the dark one
 * without a second file.
 */
export function WheatMark({
  size = 32,
  decorative = true,
}: {
  size?: number;
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="currentColor"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : "Laevo"}
      focusable="false"
    >
      <path
        d="M16 30.5V12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M16 27c0-3.2 2.6-6.2 6.4-7 .5 3.6-1.8 7-6.4 7z" />
      <path d="M16 27c0-3.2-2.6-6.2-6.4-7-.5 3.6 1.8 7 6.4 7z" />
      <path d="M16 21.5c0-3.2 2.6-6.2 6.4-7 .5 3.6-1.8 7-6.4 7z" />
      <path d="M16 21.5c0-3.2-2.6-6.2-6.4-7-.5 3.6 1.8 7 6.4 7z" />
      <path d="M16 16c0-3.2 2.6-6.2 6.4-7 .5 3.6-1.8 7-6.4 7z" />
      <path d="M16 16c0-3.2-2.6-6.2-6.4-7-.5 3.6 1.8 7 6.4 7z" />
      <path d="M16 12.5c-1.9-2.6-1.9-6.1 0-8.7 1.9 2.6 1.9 6.1 0 8.7z" />
    </svg>
  );
}

export function Wordmark({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="wordmark">
      <WheatMark size={32} />
      <span>Laevo</span>
    </Link>
  );
}
