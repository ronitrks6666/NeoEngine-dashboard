export const SECTION_COPY = {
  eyebrow: 'PRICING',
  heading: {
    line1: 'Simple pricing, ',
    highlight: 'powerful',
    line1Suffix: ' operations.',
    line2: 'Scale outlet by outlet.',
  },
  description:
    'Start with our standard plan per outlet. Need advanced modules? We’ll tailor a custom package for your team.',
};

export const STANDARD_PLAN = {
  name: 'Standard',
  price: 999,
  period: 'month',
  unit: 'per outlet',
  badge: 'Most Popular',
  description: 'Everything you need to run daily operations across one outlet.',
  features: [
    'Attendance & Face Verification',
    'Payroll & Workforce',
    'Task Management',
    'Analytics Dashboard',
    'Up to 20 staff included',
    '₹49 per additional staff/month',
    '13% off with annual billing',
  ],
} as const;

export const CUSTOM_PLAN = {
  name: 'Custom Pricing',
  description:
    'For multi-outlet groups and teams that need deeper automation, inventory control, and AI-powered operations.',
  features: [
    'Inventory Management',
    'AI Assistant',
    'AI Insights & Suggestions',
    'Multi-outlet rollouts',
    'Dedicated onboarding',
    'Priority support',
  ],
  cta: 'Talk to Sales',
} as const;

export const IMPLEMENTATION_TIME = '2–5 Days';
export const SUPPORT_LABEL = '24×7';
