export const QUICK_ASK_PROMPTS = [
  { label: "Today's Summary", prompt: "Give me today's operations summary" },
  { label: 'Attendance Today', prompt: 'How many staff came today?' },
  { label: 'Pending Tasks', prompt: 'How many pending tasks today?' },
  { label: 'Issues', prompt: 'What are the recent issues created?' },
  { label: 'Payroll Overview', prompt: 'Show payroll summary for this month' },
  { label: 'Leave Requests', prompt: 'How many staff are on leave?' },
  { label: 'Top Performers', prompt: 'Show top attendance contributors this month' },
];

export const EMPTY_STATE_EXAMPLES = [
  'How many staff came today?',
  'Who came late?',
  'Show payroll summary.',
  'Pending tasks',
  'Attendance trend',
  'Top employees',
];

const DOMAIN_SUGGESTIONS: Record<string, string[]> = {
  attendance: ['Who came late?', 'Show absentees', 'Attendance trend', 'Compare yesterday'],
  tasks: ['Who has pending tasks?', 'Escalated tasks', 'Compare this week'],
  payroll: ['Explain deductions', 'Compare last month', 'Export payroll'],
  issues: ['Show high severity issues', 'Recent issues last 30 days', 'Unresolved issues'],
  leave: ['Upcoming leave', 'Pending leave requests', 'Approved leave this month'],
  staff: ['Staff attendance today', 'Active roles', 'Top performers'],
  generic: ['Attendance today', 'Pending tasks', 'Payroll overview', 'Recent issues'],
};

export function suggestionsForDomain(domain: string) {
  return DOMAIN_SUGGESTIONS[domain] || DOMAIN_SUGGESTIONS.generic;
}
