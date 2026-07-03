import type { ParsedCardData } from './types';

const MODULE_CARD_TYPES = new Set([
  'attendance',
  'tasks',
  'payroll',
  'employee',
  'issues',
  'leave',
  'attendance_list',
  'task_list',
  'thinking',
]);

export function isInsightCardType(type: ParsedCardData['type'] | string) {
  return !MODULE_CARD_TYPES.has(type);
}
