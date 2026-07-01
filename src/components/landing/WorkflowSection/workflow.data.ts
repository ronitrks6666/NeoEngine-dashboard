export interface WorkflowStepData {
  step: number;
  title: string;
  description: string;
  icon: import('lucide-react').LucideIcon;
  illustration: import('react').ComponentType;
}

export const SECTION_COPY = {
  eyebrow: 'WORKFLOW',
  heading: {
    line1: 'From onboarding to insights.',
    line2: 'A simple workflow that ',
    highlight: 'scales',
    line2Suffix: ' with your business.',
  },
  description:
    'Go from setup to daily operations to actionable insights in three clear stages. No consultants, no complexity.',
};
