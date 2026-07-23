/** NeoEngine logo — green rounded square with white NE (matches landing home brand). */
interface NeoEngineLogoProps {
  className?: string;
  size?: number;
}

export function NeoEngineLogo({ className = '', size = 32 }: NeoEngineLogoProps) {
  const fontSize = Math.max(10, Math.round(size * 0.36));
  const radius = Math.max(6, Math.round(size * 0.22));

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-b from-green-600 to-[#047857] font-bold tracking-tight text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      NE
    </span>
  );
}
