import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarCheck,
  ClipboardList,
  FileSpreadsheet,
  MessageCircle,
  Package,
  Receipt,
  ScanFace,
  Sheet,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type TraditionalTool = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type HubNode = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Percent position in hub container */
  x: number;
  y: number;
};

export type ComparisonRow = {
  id: string;
  category: string;
  traditional: string;
  neoengine: string;
  traditionalIcon: LucideIcon;
  neoIcon: LucideIcon;
};

export const SECTION_COPY = {
  eyebrow: 'WHY NEOENGINE',
  heading: {
    line1: 'Stop managing with five different tools.',
    line2: 'Run everything from ',
    highlight: 'one platform',
    line2Suffix: '.',
  },
  description:
    'Frontline teams juggle spreadsheets, chat threads, and separate apps. NeoEngine replaces the patchwork with one connected operating system for SOPs, attendance, and payroll.',
};

export const TRADITIONAL_TOOLS: TraditionalTool[] = [
  { id: 'whatsapp', label: 'WhatsApp', description: 'Task updates lost in chat', icon: MessageCircle },
  { id: 'excel', label: 'Excel', description: 'Manual sheets for everything', icon: FileSpreadsheet },
  { id: 'pos', label: 'POS', description: 'Sales data in isolation', icon: Receipt },
  { id: 'payroll', label: 'Payroll Software', description: 'Separate from attendance', icon: Wallet },
  { id: 'inventory', label: 'Inventory Software', description: 'Stock tracked offline', icon: Package },
  { id: 'paper', label: 'Paper Checklists', description: 'No audit trail', icon: ClipboardList },
  { id: 'sheets', label: 'Google Sheets', description: 'Version chaos across outlets', icon: Sheet },
];

export const PROBLEMS = [
  'Missed tasks',
  'Payroll mistakes',
  'Inventory losses',
  'No visibility',
  'Slow reporting',
];

export const HUB_NODES: HubNode[] = [
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, x: 50, y: 8 },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList, x: 88, y: 22 },
  { id: 'inventory', label: 'Inventory', icon: Package, x: 92, y: 50 },
  { id: 'payroll', label: 'Payroll', icon: Wallet, x: 78, y: 78 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, x: 50, y: 92 },
  { id: 'workforce', label: 'Workforce', icon: Users, x: 22, y: 78 },
  { id: 'face', label: 'Face Verify', icon: ScanFace, x: 8, y: 50 },
  { id: 'ai', label: 'AI', icon: Bot, x: 12, y: 22 },
];

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    id: 'attendance',
    category: 'Attendance',
    traditional: 'Manual',
    neoengine: 'Automatic',
    traditionalIcon: ClipboardList,
    neoIcon: CalendarCheck,
  },
  {
    id: 'tasks',
    category: 'Tasks',
    traditional: 'WhatsApp',
    neoengine: 'Assigned & Tracked',
    traditionalIcon: MessageCircle,
    neoIcon: ClipboardList,
  },
  {
    id: 'payroll',
    category: 'Payroll',
    traditional: 'Separate Software',
    neoengine: 'Integrated',
    traditionalIcon: Wallet,
    neoIcon: Wallet,
  },
  {
    id: 'inventory',
    category: 'Inventory',
    traditional: 'Excel',
    neoengine: 'Live Tracking',
    traditionalIcon: FileSpreadsheet,
    neoIcon: Package,
  },
  {
    id: 'reporting',
    category: 'Reporting',
    traditional: 'End of Day',
    neoengine: 'Real Time',
    traditionalIcon: BarChart3,
    neoIcon: BarChart3,
  },
  {
    id: 'ai',
    category: 'AI',
    traditional: 'Not Available',
    neoengine: 'Built-in AI Assistant',
    traditionalIcon: AlertTriangle,
    neoIcon: Bot,
  },
];
