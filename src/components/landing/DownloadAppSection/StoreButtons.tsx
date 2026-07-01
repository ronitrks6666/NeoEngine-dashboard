import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { NEOENGINE_IOS_APP_STORE_URL, NEOENGINE_PLAY_STORE_URL } from '@/constants/downloads';

/** Apple logo path (monochrome) */
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.536c-.023-2.42 1.977-3.59 2.065-3.647-1.128-1.648-2.877-1.874-3.498-1.898-1.487-.152-2.912.884-3.668.884-.756 0-1.921-.864-3.163-.84C7.03 7.06 5.342 8.02 4.42 9.563c-1.882 3.255-.483 8.077 1.352 10.716.9 1.296 1.969 2.747 3.37 2.695 1.36-.055 1.87-.87 3.511-.87 1.64 0 2.108.87 3.534.843 1.461-.025 2.384-1.317 3.27-2.618.566-.845 1.011-1.714 1.271-2.597-3.333-1.267-3.396-5.266-.12-6.196zM14.48 5.43c.746-.924 1.25-2.196 1.11-3.49-1.072.046-2.38.737-3.149 1.643-.687.79-1.298 2.08-1.135 3.3 1.195.093 2.418-.622 3.174-1.453z" />
    </svg>
  );
}

/** Google Play colour logo (simplified) */
function GooglePlayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3.18 23.83a2 2 0 0 1-.74-.71L13.3 12 2.44.88A2 2 0 0 1 3.18.17L15.66 6.9 12.4 12l3.26 5.1-12.48 6.73z" fill="#EA4335" />
      <path d="M20.55 10.14l-3.02-1.67-3.64 3.53 3.64 3.52 3.05-1.69a2 2 0 0 0 0-3.69z" fill="#FBBC04" />
      <path d="M3.18.17a2 2 0 0 1 2.12.2l10.36 9.59-3.36 3.27L3.18.17z" fill="#34A853" />
      <path d="M3.18 23.83l9.14-9.01 3.36 3.27-10.36 9.58a2 2 0 0 1-2.14.16z" fill="#4285F4" />
    </svg>
  );
}

type BadgeLinkProps = {
  href: string;
  ariaLabel: string;
  topLine: string;
  bottomLine: string;
  icon: React.ReactNode;
  delay?: number;
};

const BadgeLink = memo(function BadgeLink({
  href,
  ariaLabel,
  topLine,
  bottomLine,
  icon,
  delay = 0,
}: BadgeLinkProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="inline-flex h-[52px] w-[168px] cursor-pointer items-center gap-3 rounded-2xl border border-white/25 bg-black/40 px-4 backdrop-blur-sm transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-black/55 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A7A59]"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-white">
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[9px] font-medium tracking-wide text-white/70">{topLine}</span>
        <span className="text-[13px] font-bold text-white">{bottomLine}</span>
      </span>
    </motion.a>
  );
});

export const StoreButtons = memo(function StoreButtons() {
  return (
    <div className="flex flex-row flex-wrap items-center justify-center gap-3 sm:justify-start">
      <BadgeLink
        href={NEOENGINE_IOS_APP_STORE_URL}
        ariaLabel="Download NeoEngine on the Apple App Store"
        topLine="Download on the"
        bottomLine="App Store"
        icon={<AppleLogo className="h-6 w-6" />}
        delay={0}
      />
      <BadgeLink
        href={NEOENGINE_PLAY_STORE_URL}
        ariaLabel="Get NeoEngine on Google Play"
        topLine="Get it on"
        bottomLine="Google Play"
        icon={<GooglePlayLogo className="h-5 w-5" />}
        delay={0.08}
      />
    </div>
  );
});
