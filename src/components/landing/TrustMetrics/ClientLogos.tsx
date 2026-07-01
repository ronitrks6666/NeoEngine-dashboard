import { memo } from 'react';
import type { ClientLogo } from './trust-metrics.data';

type ClientLogosProps = {
  logos: ClientLogo[];
};

export const ClientLogos = memo(function ClientLogos({ logos }: ClientLogosProps) {
  return (
    <ul className="mx-auto grid max-w-6xl grid-cols-2 place-items-center gap-x-6 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-wrap lg:justify-center lg:gap-x-12 lg:gap-y-8">
      {logos.map((logo) => (
        <li key={logo.id}>
          <div
            className="flex min-h-[44px] items-center justify-center grayscale opacity-[0.55] transition-all duration-[250ms] hover:scale-[1.04] hover:opacity-100 hover:grayscale-0"
            aria-hidden="true"
          >
            <span className="whitespace-nowrap text-base font-semibold tracking-tight text-slate-500 sm:text-lg">
              {logo.name}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
});
