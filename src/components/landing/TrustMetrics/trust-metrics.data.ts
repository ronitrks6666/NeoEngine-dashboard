import {
  Activity,
  Bot,
  CheckSquare,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type TrustMetric = {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  /** Final display when animation is skipped or static */
  displayValue: string;
  /** Numeric target for count-up; omit for static values */
  numericValue?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  format?: 'number' | 'percent' | 'static';
};

export type ClientLogo = {
  id: string;
  name: string;
};

export const TRUST_SECTION_LABEL = 'TRUSTED BY GROWING SME BRANDS';

export const CLIENT_LOGOS: ClientLogo[] = [
  { id: 'retail', name: 'Retail' },
  { id: 'hospitality', name: 'Hospitality' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'manufacturing', name: 'Manufacturing' },
  { id: 'services', name: 'Services' },
  { id: 'logistics', name: 'Logistics' },
  { id: 'education', name: 'Education' },
  { id: 'franchise', name: 'Franchise' },
];

export const TRUST_METRICS: TrustMetric[] = [
  {
    id: 'businesses',
    icon: Store,
    displayValue: '75+',
    numericValue: 75,
    suffix: '+',
    label: 'Businesses Running',
    description: 'Across India',
    format: 'number',
  },
  {
    id: 'employees',
    icon: Users,
    displayValue: '450+',
    numericValue: 450,
    suffix: '+',
    label: 'Employees Managed',
    description: 'Every Day',
    format: 'number',
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    displayValue: '180K+',
    numericValue: 180,
    suffix: 'K+',
    label: 'Tasks Completed',
    description: 'Monthly',
    format: 'number',
  },
  {
    id: 'uptime',
    icon: Activity,
    displayValue: '99.98%',
    numericValue: 99.98,
    suffix: '%',
    decimals: 2,
    label: 'Platform Uptime',
    description: 'Reliable Operations',
    format: 'percent',
  },
  {
    id: 'monitoring',
    icon: Bot,
    displayValue: '24×7',
    label: 'AI Monitoring',
    description: 'Always Active',
    format: 'static',
  },
];
