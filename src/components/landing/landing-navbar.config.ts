import { NEOENGINE_APK_ROUTE } from '@/constants/downloads';

export type LandingNavChild = {
  label: string;
  href: string;
  external?: boolean;
};

export type LandingNavItem = {
  label: string;
  href?: string;
  children?: LandingNavChild[];
};

export const LANDING_NAV_ITEMS: LandingNavItem[] = [
  {
    label: 'Product',
    href: '#product',
    children: [
      { label: 'Platform overview', href: '#product' },
      { label: 'Mobile app', href: '#download' },
      { label: 'Watch demo', href: '#demo' },
    ],
  },
  {
    label: 'Solutions',
    href: '#solutions',
    children: [
      { label: 'Workforce & operations', href: '#solutions' },
      { label: 'Why NeoEngine', href: '#solutions' },
      { label: 'Customer stories', href: '#stories' },
    ],
  },
  {
    label: 'Pricing',
    href: '#pricing',
  },
  {
    label: 'Resources',
    children: [
      { label: 'Download APK', href: NEOENGINE_APK_ROUTE },
      { label: 'Privacy policy', href: '/privacy-policy' },
      { label: 'Terms of service', href: '/terms-of-service' },
    ],
  },
  {
    label: 'Company',
    children: [
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy policy', href: '/privacy-policy' },
      { label: 'Terms of service', href: '/terms-of-service' },
    ],
  },
];
