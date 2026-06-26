import { NeoEngineLogo } from '@/components/NeoEngineLogo';
import type { BrandProfile } from '@/api/owner';

type Props = {
  brand?: BrandProfile | null;
  className?: string;
  logoSize?: number;
  /** Sidebar (dark green) vs top bar (white). */
  variant?: 'sidebar' | 'header';
};

function resolveLogoSrc(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api\/?$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export function CoBrandMark({ brand, className = '', logoSize = 28, variant = 'sidebar' }: Props) {
  const partnerName = brand?.displayName?.trim() || null;
  const partnerLogo = resolveLogoSrc(brand?.logoUrl);
  const showPartner = Boolean(partnerName || partnerLogo);
  const isHeader = variant === 'header';

  return (
    <div className={`flex items-center min-w-0 ${isHeader ? 'gap-3' : 'gap-2'} ${className}`}>
      {isHeader ? (
        <span className="flex shrink-0 items-baseline gap-0">
          <span className="text-xl font-extrabold tracking-tight text-slate-900">neo</span>
          <span className="text-xl font-extrabold tracking-tight text-emerald-700">Engine</span>
        </span>
      ) : (
        <>
          <NeoEngineLogo size={logoSize} className="shrink-0" />
          <span className="truncate text-lg font-extrabold tracking-tight text-emerald-50">neoEngine</span>
        </>
      )}
      {showPartner ? (
        <>
          <span
            className={
              isHeader ? 'text-lg font-bold text-slate-400' : 'font-bold text-emerald-200/90'
            }
          >
            |
          </span>
          {partnerLogo ? (
            <img
              src={partnerLogo}
              alt=""
              className={`shrink-0 object-contain ${isHeader ? 'rounded-md' : 'h-8 w-8 rounded-lg'}`}
              style={isHeader ? { width: logoSize, height: logoSize } : undefined}
            />
          ) : null}
          {partnerName ? (
            <span
              className={`truncate font-extrabold tracking-tight ${
                isHeader ? 'text-lg text-slate-900' : 'text-base text-white'
              }`}
            >
              {partnerName}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
