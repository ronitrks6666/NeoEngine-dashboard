export type SummaryMetric = {
  id: string;
  label: string;
  value: string;
  trend: string;
};

export type OutletProgress = {
  id: string;
  name: string;
  percent: number;
};

export type TaskItem = {
  id: string;
  label: string;
  status: 'completed' | 'pending';
};

export type NavItem = {
  id: string;
  label: string;
  icon: 'home' | 'tasks' | 'analytics' | 'profile';
  active?: boolean;
};

export const MOBILE_GREETING = {
  name: 'Arjun',
  subtitle: "Here's what's happening today",
};

export const SUMMARY_METRICS: SummaryMetric[] = [
  { id: 'staff', label: 'Staff Present', value: '642', trend: '+12%' },
  { id: 'tasks', label: 'Tasks Completed', value: '85%', trend: '+8%' },
];

export const OUTLET_PROGRESS: OutletProgress[] = [
  { id: 'koramangala', name: 'Koramangala', percent: 92 },
  { id: 'indiranagar', name: 'Indiranagar', percent: 86 },
  { id: 'hsr', name: 'HSR Layout', percent: 80 },
];

export const TASK_ITEMS: TaskItem[] = [
  { id: '1', label: 'Opening checklist', status: 'completed' },
  { id: '2', label: 'Inventory Count', status: 'pending' },
  { id: '3', label: 'Staff Briefing', status: 'completed' },
];

export const BOTTOM_NAV: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', active: true },
  { id: 'tasks', label: 'Tasks', icon: 'tasks' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'profile', label: 'Profile', icon: 'profile' },
];
