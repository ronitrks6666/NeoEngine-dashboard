export const SECTION_COPY = {
  eyebrow: 'MOBILE APP',
  heading: 'Manage your business,\nfrom anywhere.',
  description:
    'Stay connected to your outlets with real-time attendance, task updates, analytics and instant notifications directly from your phone.',
};

export const FEATURE_ITEMS = [
  'Real-time attendance',
  'Task approvals',
  'Live outlet monitoring',
  'Payroll notifications',
  'Business analytics',
  'Push notifications',
] as const;

/** Positions are relative to the phone mockup wrapper, not the full column. */
export const FLOATING_METRICS = [
  {
    id: 'attendance',
    label: 'Attendance',
    value: '98%',
    tone: 'green' as const,
    offset: { left: '-6%', top: '14%' },
    delay: 0,
  },
  {
    id: 'tasks',
    label: "Today's Tasks",
    value: '26 Completed',
    tone: 'white' as const,
    offset: { left: '72%', top: '10%' },
    delay: 0.8,
  },
  {
    id: 'outlets',
    label: 'Outlets Live',
    value: '12/12',
    tone: 'white' as const,
    offset: { left: '68%', top: '78%' },
    delay: 1.6,
  },
];
