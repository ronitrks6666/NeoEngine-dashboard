/** NeoEngine logo - Clean N + E monogram with subtle engine accent */
import { useId } from 'react';

interface NeoEngineLogoProps {
  className?: string;
  size?: number;
}

export function NeoEngineLogo({ className = '', size = 32 }: NeoEngineLogoProps) {
  const id = useId();
  const gradId = `neo-grad-${id.replace(/:/g, '')}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gradId})`} />
      {/* N - left bar, diagonal, right bar */}
      <path
        d="M14 46V18h5L37 46h5V18h-5L19 46h-5z"
        fill="white"
      />
      {/* E - clean three bars */}
      <path
        d="M46 18h12v4h-8v5h6v4h-6v5h8v4H46V18z"
        fill="white"
      />
    </svg>
  );
}
