export type Industry = 'Cloud Kitchen' | 'Cafe' | 'Fine Dining' | 'QSR';

export interface SuccessStory {
  id: string;
  restaurant: string;
  location: string;
  industry: Industry;
  quote: string;
  revenueIncrease?: number;
  timeSaved?: string;
  foodWasteReduction?: number;
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
  restaurant: string;
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
    line1: 'Trusted by restaurants',
    line2: 'that are ',
    highlight: 'growing faster',
    line2Suffix: '.',
  },
  description:
    'Real operators share how NeoEngine cut manual work, tightened multi-outlet control, and turned daily chaos into measurable growth.',
};

export const FEATURED_STORY: FeaturedStoryData = {
  ownerName: 'Priya Mehta',
  restaurant: 'Spice Route Kitchens',
  location: 'Mumbai · 6 Outlets',
  designation: 'Founder & Operations Head',
  avatarInitials: 'PM',
  quote:
    'We were losing hours to WhatsApp updates and spreadsheet payroll. NeoEngine gave us one dashboard for attendance, tasks, and inventory. We cut operational issues by half and finally scaled without adding headcount.',
  metrics: [
    { id: 'hours', label: 'Hours Saved Weekly', value: 18, suffix: ' hrs', positive: true },
    { id: 'labour', label: 'Labour Cost Reduced', value: 12, prefix: '-', suffix: '%', positive: true },
    { id: 'tasks', label: 'Task Completion', value: 98, suffix: '%' },
    { id: 'attendance', label: 'Attendance Accuracy', value: 99, suffix: '%' },
  ],
  beforeValues: [42, 48, 45, 52, 49, 47, 44],
  afterValues: [58, 64, 71, 78, 82, 88, 94],
};

export const SUCCESS_STORIES: SuccessStory[] = [
  {
    id: 'cloud-kitchen',
    restaurant: 'UrbanBite Cloud',
    location: 'Bengaluru',
    industry: 'Cloud Kitchen',
    quote: 'Sales visibility across brands went from weekly guesses to live numbers.',
    revenueIncrease: 41,
    logo: 'UB',
    bigMetric: { value: '+41%', label: 'Sales', numericValue: 41, prefix: '+', suffix: '%' },
  },
  {
    id: 'cafe',
    restaurant: 'Brew & Barrel',
    location: 'Pune',
    industry: 'Cafe',
    quote: 'Opening checklists and shift handoffs now take minutes, not hours.',
    timeSaved: '2.4 hrs',
    logo: 'BB',
    bigMetric: { value: '2.4 hrs', label: 'Saved Daily', numericValue: 2.4, suffix: ' hrs', decimals: 1 },
  },
  {
    id: 'fine-dining',
    restaurant: 'The Copper Table',
    location: 'Hyderabad',
    industry: 'Fine Dining',
    quote: 'Every outlet follows the same SOP. Compliance is no longer a guessing game.',
    taskCompletion: 96,
    logo: 'CT',
    bigMetric: { value: '96%', label: 'Task Completion', numericValue: 96, suffix: '%' },
  },
  {
    id: 'qsr',
    restaurant: 'Crisp & Co.',
    location: 'Delhi NCR',
    industry: 'QSR',
    quote: 'Inventory alerts stopped us from over-ordering and throwing away margin.',
    foodWasteReduction: 34,
    logo: 'CC',
    bigMetric: { value: '34%', label: 'Lower Food Waste', numericValue: 34, suffix: '%' },
  },
  {
    id: 'video',
    restaurant: 'PlateCraft Group',
    location: 'Chennai · 4 Outlets',
    industry: 'QSR',
    quote: 'Hear how PlateCraft unified payroll and outlet reporting in 30 days.',
    logo: 'PC',
    bigMetric: { value: '+22%', label: 'Margin Growth', numericValue: 22, prefix: '+', suffix: '%' },
    isVideo: true,
  },
  {
    id: 'multi-brand',
    restaurant: 'Fire & Fork',
    location: 'Jaipur',
    industry: 'Cloud Kitchen',
    quote: 'NeoEngine replaced three separate tools. Our team actually uses one system now.',
    revenueIncrease: 33,
    logo: 'FF',
    bigMetric: { value: '+33%', label: 'Revenue Growth', numericValue: 33, prefix: '+', suffix: '%' },
  },
];

export const BRAND_LOGOS: BrandLogo[] = [
  { id: 'spice-route', name: 'Spice Route', color: '#0F8F68' },
  { id: 'urbanbite', name: 'UrbanBite', color: '#2563EB' },
  { id: 'brew-barrel', name: 'Brew & Barrel', color: '#D97706' },
  { id: 'copper-table', name: 'Copper Table', color: '#7C3AED' },
  { id: 'crisp-co', name: 'Crisp & Co.', color: '#DC2626' },
  { id: 'platecraft', name: 'PlateCraft', color: '#0891B2' },
  { id: 'fire-fork', name: 'Fire & Fork', color: '#EA580C' },
  { id: 'saffron-lane', name: 'Saffron Lane', color: '#CA8A04' },
  { id: 'grain-house', name: 'Grain House', color: '#16A34A' },
  { id: 'nova-bistro', name: 'Nova Bistro', color: '#4F46E5' },
];
