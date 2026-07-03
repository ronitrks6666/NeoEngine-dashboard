import type { OperationsAiChatResponse } from '@/api/operationsAi';

export type CardType =
  | 'attendance'
  | 'tasks'
  | 'payroll'
  | 'employee'
  | 'issues'
  | 'leave'
  | 'staff'
  | 'roles'
  | 'events'
  | 'outlet'
  | 'knowledge'
  | 'analytics'
  | 'planned'
  | 'thinking'
  | 'error'
  | 'generic';

export type ParsedContext = {
  outlet?: string;
  period?: string;
  employee?: string;
};

export type AttendanceCardData = {
  type: 'attendance';
  title: string;
  present: number;
  late: number;
  absent: number;
  onLeave?: number;
  attendancePct: number;
  trend?: string;
  context: ParsedContext;
  rawText: string;
};

export type TasksCardData = {
  type: 'tasks';
  title: string;
  pending: number;
  completed: number;
  escalated: number;
  completionPct: number;
  context: ParsedContext;
  rawText: string;
};

export type PayrollCardData = {
  type: 'payroll';
  title: string;
  grossSalary?: number;
  netSalary: number;
  deductions?: number;
  bonus?: number;
  overtime?: number;
  recordsCount?: number;
  periodLabel?: string;
  context: ParsedContext;
  rawText: string;
};

export type EmployeeCardData = {
  type: 'employee';
  title: string;
  name: string;
  role?: string;
  status: string;
  presentDays?: number;
  lateDays?: number;
  netPayable?: number;
  grossEarned?: number;
  paidAmount?: number;
  remainingAmount?: number;
  hoursWorked?: number;
  bonuses?: number;
  deductions?: number;
  tasksPending?: number;
  tasksCompleted?: number;
  tasksEscalated?: number;
  periodLabel?: string;
  cardMode?: 'attendance' | 'payroll' | 'summary';
  context: ParsedContext;
  rawText: string;
};

export type IssueItem = {
  number?: string;
  title: string;
};

export type IssuesCardData = {
  type: 'issues';
  title: string;
  open: number;
  resolved: number;
  closed: number;
  recent: IssueItem[];
  context: ParsedContext;
  rawText: string;
};

export type LeaveCardData = {
  type: 'leave';
  title: string;
  onLeave: number;
  pending: number;
  approved: number;
  rejected: number;
  context: ParsedContext;
  rawText: string;
};

export type GenericCardData = {
  type: 'generic' | 'staff' | 'roles' | 'events' | 'outlet' | 'knowledge' | 'analytics' | 'planned' | 'error';
  title: string;
  body: string;
  highlights?: Array<{ label: string; value: string }>;
  context: ParsedContext;
  rawText: string;
};

export type ThinkingCardData = {
  type: 'thinking';
  title: string;
  steps: string[];
  rawText: string;
};

export type StaffListCardData = {
  type: 'attendance_list';
  listType: 'absent' | 'late' | 'present';
  staff: Array<{ name: string; role?: string | null }>;
  total: number;
  context: ParsedContext;
  rawText: string;
};

export type TaskListCardData = {
  type: 'task_list';
  listType: 'escalated' | 'pending' | 'completed';
  tasks: Array<{ title: string; employeeName: string; escalationLevel?: number }>;
  total: number;
  context: ParsedContext;
  rawText: string;
};

export type ParsedCardData =
  | AttendanceCardData
  | TasksCardData
  | PayrollCardData
  | EmployeeCardData
  | IssuesCardData
  | LeaveCardData
  | StaffListCardData
  | TaskListCardData
  | GenericCardData
  | ThinkingCardData;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
  createdAt: string;
  apiData?: OperationsAiChatResponse['data'];
  isThinking?: boolean;
};

export type ChatThread = {
  id: string;
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  pinned?: boolean;
};

export type ThreadUiPrefs = {
  pinnedIds: string[];
  hiddenIds: string[];
  titleOverrides: Record<string, string>;
};
