/** NeoEngine app logo - matches the mobile app branding */
interface NeoEngineLogoProps {
  className?: string;
  size?: number;
}

export function NeoEngineLogo({ className = '', size = 32 }: NeoEngineLogoProps) {
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
        <linearGradient id="neoengine-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#neoengine-grad)" />
      <path
        d="M18 44V20h6l10 14 10-14h6v24h-6V28l-8 11-8-11v16h-6z"
        fill="white"
      />
    </svg>
  );
}
