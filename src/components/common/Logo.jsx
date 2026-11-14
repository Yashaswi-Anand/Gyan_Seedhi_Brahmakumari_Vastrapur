import { useId } from 'react';
import logoUrl from '@/assets/logo.webp';

/** Round centre logo. */
export default function Logo({ size = 34 }) {
  const clip = useId();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <image
        href={logoUrl}
        x="0"
        y="0"
        width="64"
        height="64"
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clip})`}
      />
    </svg>
  );
}
