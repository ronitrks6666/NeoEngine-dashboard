import {
  LayoutDashboard,
  Store,
  Clock,
  CheckSquare,
  Wallet,
  BarChart3,
  FileText,
  Users,
  Calendar,
  Settings,
  UserCheck,
  ClipboardCheck,
  Banknote,
  BadgeCheck,
  ListPlus,
  Fingerprint,
  PlayCircle,
  FileBarChart,
  type LucideIcon,
} from 'lucide-react';

export type SidebarNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

export type KpiMetric = {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
};

export type ActivityItem = {
  id: string;
  title: string;
  timestamp: string;
  icon: LucideIcon;
};

export type QuickActionItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  fill: string;
  values: number[];
};

export const SIDEBAR_NAV: SidebarNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, active: true },
  { id: 'outlets', label: 'Outlets', icon: Store },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'payroll', label: 'Payroll', icon: Wallet },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'leave', label: 'Leave', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const KPI_METRICS: KpiMetric[] = [
  { id: 'staff', label: 'Staff Present', value: '642', trend: '+12%', trendUp: true },
  { id: 'tasks', label: 'Tasks Completed', value: '85%', trend: '+8%', trendUp: true },
  { id: 'payroll', label: 'Payroll Ready', value: '₹28.4L', trend: '+5%', trendUp: true },
  { id: 'outlets', label: 'Outlets Active', value: '12', trend: '+2', trendUp: true },
];

export const CHART_LABELS = ['12AM', '4AM', '8AM', '12PM', '4PM', '8PM'];

export const CHART_SERIES: ChartSeries[] = [
  {
    id: 'attendance',
    label: 'Attendance',
    color: '#0F8F68',
    fill: 'rgba(15, 143, 104, 0.18)',
    values: [32, 28, 45, 62, 78, 70],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    color: '#16A34A',
    fill: 'rgba(34, 197, 94, 0.12)',
    values: [22, 35, 48, 55, 68, 60],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    color: '#22C55E',
    fill: 'rgba(34, 197, 94, 0.08)',
    values: [18, 24, 30, 42, 50, 46],
  },
];

export const ACTIVITY_ITEMS: ActivityItem[] = [
  { id: '1', title: 'Rahul checked in', timestamp: '2m ago', icon: UserCheck },
  { id: '2', title: 'Kitchen checklist completed', timestamp: '8m ago', icon: ClipboardCheck },
  { id: '3', title: 'Payroll generated', timestamp: '14m ago', icon: Banknote },
  { id: '4', title: 'Leave approved for Priya', timestamp: '22m ago', icon: BadgeCheck },
  { id: '5', title: 'New task assigned: Front desk', timestamp: '31m ago', icon: CheckSquare },
];

export const QUICK_ACTIONS: QuickActionItem[] = [
  { id: 'task', label: 'Add Task', icon: ListPlus },
  { id: 'attendance', label: 'Mark Attendance', icon: Fingerprint },
  { id: 'payroll', label: 'Run Payroll', icon: PlayCircle },
  { id: 'reports', label: 'View Reports', icon: FileBarChart },
];

export const DASHBOARD_HEADER = {
  title: 'Overview',
  outlet: 'Downtown Branch',
  user: { name: 'Aisha K.', initials: 'AK' },
};
