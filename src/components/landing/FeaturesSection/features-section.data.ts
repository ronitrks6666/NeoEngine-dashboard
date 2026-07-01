import {
  BarChart3,
  Boxes,
  CheckSquare,
  Clock,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type FeatureBentoItem = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  illustration: 'workforce' | 'tasks' | 'attendance' | 'payroll' | 'inventory' | 'analytics';
  gridClass: string;
  large?: boolean;
};

export const FEATURES_EYEBROW = 'ONE PLATFORM. EVERY OPERATION.';

export const FEATURES_HEADING = {
  line1: 'Everything your restaurant needs,',
  line2Prefix: 'in one ',
  line2Highlight: 'operating system',
  line2Suffix: '.',
};

export const FEATURES_DESCRIPTION =
  'NeoEngine unifies workforce, tasks, attendance, payroll, inventory, and analytics, so every outlet runs on one intelligent platform built for restaurant operations.';

export const BENTO_FEATURES: FeatureBentoItem[] = [
  {
    id: 'workforce',
    title: 'Workforce Management',
    description:
      'Manage staff across outlets with roles, shifts, and real-time visibility into who is on the floor.',
    icon: Users,
    illustration: 'workforce',
    gridClass: 'md:col-span-2 lg:col-span-6',
    large: true,
  },
  {
    id: 'tasks',
    title: 'Task Automation',
    description:
      'Automate opening checklists, SOPs, and recurring workflows with smart assignments and reminders.',
    icon: CheckSquare,
    illustration: 'tasks',
    gridClass: 'lg:col-span-3',
    large: true,
  },
  {
    id: 'attendance',
    title: 'Attendance Tracking',
    description:
      'Face-verified punch-ins, late alerts, and outlet-level attendance dashboards in real time.',
    icon: Clock,
    illustration: 'attendance',
    gridClass: 'lg:col-span-3',
  },
  {
    id: 'payroll',
    title: 'Payroll',
    description:
      'Run payroll with attendance-linked calculations, approvals, and transparent salary breakdowns.',
    icon: Wallet,
    illustration: 'payroll',
    gridClass: 'lg:col-span-4',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description:
      'Track stock levels, low-inventory alerts, and replenishment workflows across every kitchen.',
    icon: Boxes,
    illustration: 'inventory',
    gridClass: 'lg:col-span-4',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description:
      'Outlet performance, labor costs, and operational KPIs in dashboards your team actually uses.',
    icon: BarChart3,
    illustration: 'analytics',
    gridClass: 'lg:col-span-4',
  },
];
