export type Industry = 'Retail' | 'Healthcare' | 'Manufacturing' | 'Hospitality' | 'Services';

export interface SuccessStory {
  id: string;
  company: string;
  location: string;
  industry: Industry;
  quote: string;
  revenueIncrease?: number;
  timeSaved?: string;
  wasteReduction?: number;
  taskCompletion?: number;
  logo: string;
  bigMetric: {
    value: string;
    label: string;
    numericValue?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
  };
  isVideo?: boolean;
}

export interface FeaturedStoryData {
  ownerName: string;
  company: string;
  location: string;
  designation: string;
  avatarInitials: string;
  quote: string;
  metrics: {
    id: string;
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    positive?: boolean;
  }[];
  beforeValues: number[];
  afterValues: number[];
}

export interface BrandLogo {
  id: string;
  name: string;
  color: string;
}

export const SECTION_COPY = {
  eyebrow: 'CUSTOMER STORIES',
  heading: {
    line1: 'Trusted by SMEs',
    line2: 'that are ',
    highlight: 'growing faster',
    line2Suffix: '.',
  },
  description:
    'Operators across retail, healthcare, manufacturing, and more share how NeoEngine tightened SOPs, attendance, and payroll—and turned daily chaos into measurable control.',
};

export const FEATURED_STORY: FeaturedStoryData = {
  ownerName: 'Priya Mehta',
  company: 'BrightPath Retail',
  location: 'Mumbai · 6 Locations',
  designation: 'Founder & Operations Head',
  avatarInitials: 'PM',
  quote:
    'We were losing hours to WhatsApp updates and spreadsheet payroll. NeoEngine gave us one dashboard for SOPs, attendance, and payroll. We cut operational issues by half and finally scaled without adding headcount.',
  metrics: [
    { id: 'hours', label: 'Hours Saved Weekly', value: 18, suffix: ' hrs', positive: true },
    { id: 'labour', label: 'Labour Cost Reduced', value: 12, prefix: '-', suffix: '%', positive: true },
    { id: 'tasks', label: 'SOP Completion', value: 98, suffix: '%' },
    { id: 'attendance', label: 'Attendance Accuracy', value: 99, suffix: '%' },
  ],
  beforeValues: [42, 48, 45, 52, 49, 47, 44],
  afterValues: [58, 64, 71, 78, 82, 88, 94],
};

export const SUCCESS_STORIES: SuccessStory[] = [
  {
    id: 'retail',
    company: 'UrbanMart Stores',
    location: 'Bengaluru',
    industry: 'Retail',
    quote: 'Store-level visibility went from weekly guesses to live attendance and task numbers.',
    revenueIncrease: 41,
    logo: 'UM',
    bigMetric: { value: '+41%', label: 'Productivity', numericValue: 41, prefix: '+', suffix: '%' },
  },
  {
    id: 'healthcare',
    company: 'CareFirst Clinics',
    location: 'Pune',
    industry: 'Healthcare',
    quote: 'Opening checklists and shift handoffs now take minutes, not hours.',
    timeSaved: '2.4 hrs',
    logo: 'CF',
    bigMetric: { value: '2.4 hrs', label: 'Saved Daily', numericValue: 2.4, suffix: ' hrs', decimals: 1 },
  },
  {
    id: 'manufacturing',
    company: 'NovaFab Industries',
    location: 'Hyderabad',
    industry: 'Manufacturing',
    quote: 'Every site follows the same SOP. Compliance is no longer a guessing game.',
    taskCompletion: 96,
    logo: 'NF',
    bigMetric: { value: '96%', label: 'SOP Completion', numericValue: 96, suffix: '%' },
  },
  {
    id: 'hospitality',
    company: 'Harbor & Co.',
    location: 'Delhi NCR',
    industry: 'Hospitality',
    quote: 'Attendance-linked payroll stopped errors and saved our managers hours every month.',
    wasteReduction: 34,
    logo: 'HC',
    bigMetric: { value: '34%', label: 'Less Payroll Rework', numericValue: 34, suffix: '%' },
  },
  {
    id: 'video',
    company: 'PlateCraft Group',
    location: 'Chennai · 4 Locations',
    industry: 'Services',
    quote: 'Hear how PlateCraft unified payroll and outlet reporting in 30 days.',
    logo: 'PC',
    bigMetric: { value: '+22%', label: 'Margin Growth', numericValue: 22, prefix: '+', suffix: '%' },
    isVideo: true,
  },
  {
    id: 'logistics',
    company: 'SwiftRoute Logistics',
    location: 'Jaipur',
    industry: 'Services',
    quote: 'NeoEngine replaced three separate tools. Our team actually uses one system now.',
    revenueIncrease: 33,
    logo: 'SR',
    bigMetric: { value: '+33%', label: 'On-time Tasks', numericValue: 33, prefix: '+', suffix: '%' },
  },
];

export const BRAND_LOGOS: BrandLogo[] = [
  { id: 'brightpath', name: 'BrightPath', color: '#0F8F68' },
  { id: 'urbanmart', name: 'UrbanMart', color: '#2563EB' },
  { id: 'carefirst', name: 'CareFirst', color: '#D97706' },
  { id: 'novafab', name: 'NovaFab', color: '#7C3AED' },
  { id: 'harbor', name: 'Harbor & Co.', color: '#DC2626' },
  { id: 'platecraft', name: 'PlateCraft', color: '#0891B2' },
  { id: 'swiftroute', name: 'SwiftRoute', color: '#EA580C' },
  { id: 'apex-care', name: 'Apex Care', color: '#CA8A04' },
  { id: 'metro-retail', name: 'Metro Retail', color: '#16A34A' },
  { id: 'vertex-works', name: 'Vertex Works', color: '#4F46E5' },
];
