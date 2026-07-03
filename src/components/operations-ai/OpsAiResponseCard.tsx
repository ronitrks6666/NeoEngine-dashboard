import { useMemo } from 'react';
import { parseResponseCard } from './parseResponseCard';
import type { ChatMessage } from './types';
import { AttendanceCard } from './cards/AttendanceCard';
import { TasksCard } from './cards/TasksCard';
import { PayrollCard } from './cards/PayrollCard';
import { EmployeeCard } from './cards/EmployeeCard';
import { IssuesCard } from './cards/IssuesCard';
import { LeaveCard } from './cards/LeaveCard';
import { StaffListCard } from './cards/StaffListCard';
import { TaskListCard } from './cards/TaskListCard';
import { GenericCard } from './cards/GenericCard';
import { ThinkingCard } from './ThinkingCard';
import { isInsightCardType } from './cardRouting';

type Props = {
  message: ChatMessage;
  onSuggestionSelect?: (prompt: string) => void;
  showFollowUps?: boolean;
};

export function OpsAiResponseCard({ message, onSuggestionSelect, showFollowUps }: Props) {
  const parsed = useMemo(
    () => parseResponseCard(message.text, message.meta),
    [message.text, message.meta]
  );

  if (message.isThinking || parsed.type === 'thinking') {
    return <ThinkingCard data={parsed.type === 'thinking' ? parsed : { type: 'thinking', title: 'Thinking', steps: [message.text], rawText: message.text }} />;
  }

  const updatedAt = message.createdAt;

  switch (parsed.type) {
    case 'attendance':
      return <AttendanceCard data={parsed} updatedAt={updatedAt} />;
    case 'tasks':
      return <TasksCard data={parsed} updatedAt={updatedAt} />;
    case 'payroll':
      return <PayrollCard data={parsed} updatedAt={updatedAt} />;
    case 'employee':
      return <EmployeeCard data={parsed} updatedAt={updatedAt} />;
    case 'issues':
      return <IssuesCard data={parsed} updatedAt={updatedAt} />;
    case 'leave':
      return <LeaveCard data={parsed} updatedAt={updatedAt} />;
    case 'attendance_list':
      return <StaffListCard data={parsed} updatedAt={updatedAt} />;
    case 'task_list':
      return <TaskListCard data={parsed} updatedAt={updatedAt} />;
    default:
      return (
        <GenericCard
          data={parsed}
          meta={message.meta}
          updatedAt={updatedAt}
          onSuggestionSelect={onSuggestionSelect}
          showFollowUps={showFollowUps}
        />
      );
  }
}

export { isInsightCardType };
