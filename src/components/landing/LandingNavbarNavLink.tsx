import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { handleLandingHashClick } from './landing-scroll';
import type { LandingNavItem } from './landing-navbar.config';

type LandingNavbarNavLinkProps = {
  item: LandingNavItem;
};

function isInternalRoute(href: string) {
  return href.startsWith('/') && !href.startsWith('//');
}

function NavAnchor({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (handleLandingHashClick(event, href)) {
      onClick?.();
      return;
    }
    onClick?.();
  };

  if (isInternalRoute(href)) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

export function LandingNavbarNavLink({ item }: LandingNavbarNavLinkProps) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const underlineClasses =
    "relative text-[15px] font-medium text-gray-700 transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 after:pointer-events-none after:absolute after:-bottom-1 after:left-1/2 after:h-px after:w-full after:-translate-x-1/2 after:origin-center after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 after:content-[''] hover:after:scale-x-100";

  if (!item.children?.length) {
    return (
      <NavAnchor href={item.href ?? '#'} className={underlineClasses}>
        {item.label}
      </NavAnchor>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={`${menuId}-trigger`}
        className={`group inline-flex items-center gap-1 ${underlineClasses}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${menuId}-menu`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {item.label}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 group-hover:text-primary ${open ? 'rotate-180 text-primary' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={`${menuId}-menu`}
        role="menu"
        aria-labelledby={`${menuId}-trigger`}
        className={`absolute left-1/2 top-full z-50 mt-3 min-w-[12rem] -translate-x-1/2 rounded-xl border border-black/5 bg-white/95 p-2 shadow-emerald-lg backdrop-blur-md transition-all duration-200 ${
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0'
        }`}
      >
        {item.children.map((child) => (
          <NavAnchor
            key={child.label}
            href={child.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-emerald-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setOpen(false)}
          >
            {child.label}
          </NavAnchor>
        ))}
      </div>
    </div>
  );
}
