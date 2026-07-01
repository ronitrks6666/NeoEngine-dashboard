import { Link } from 'react-router-dom';

export function LandingNavbarBrand() {
  return (
    <Link
      to="/"
      className="flex items-center gap-3.5 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label="NeoEngine home"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-b from-green-600 to-primary-dark text-sm font-bold tracking-tight text-white"
        aria-hidden="true"
      >
        NE
      </span>
      <span className="text-xl font-bold leading-none tracking-tight text-gray-900 sm:text-2xl lg:text-[28px]">
        NeoEngine
      </span>
    </Link>
  );
}
