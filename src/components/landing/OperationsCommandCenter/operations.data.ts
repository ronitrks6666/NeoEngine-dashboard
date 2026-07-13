export type OutletStatus = 'Healthy' | 'Attention' | 'Critical';

export interface Outlet {
  id: string;
  name: string;
  city: string;
  /** SVG viewBox X (0–612) */
  x: number;
  /** SVG viewBox Y (0–696) */
  y: number;
  status: OutletStatus;
  outletCount: number;
  healthScore: number;
  isPrimary?: boolean;
}

// Coordinates are calibrated to the india-outline.svg viewBox (0 0 612 696).
// Derived from Mercator lat/lon projection used by VictorCazanave/svg-maps.
// Formula:  x = (lon - 68.7) * 21.6   y = (37.1 - lat) * 23.4
// Verified against known SVG path anchors: Delhi (188,205), Goa (115,504).
export const HQ_POSITION = { x: 191, y: 565, label: 'Bengaluru' };

export const OUTLETS: Outlet[] = [
  {
    id: 'blr',
    name: 'Koramangala Cluster',
    city: 'Bengaluru',
    x: 191,   // 12.97°N 77.56°E
    y: 565,
    status: 'Healthy',
    outletCount: 18,
    healthScore: 92,
    isPrimary: true,
  },
  {
    id: 'mum',
    name: 'Mumbai Cluster',
    city: 'Mumbai',
    x: 90,    // 19.07°N 72.88°E
    y: 422,
    status: 'Healthy',
    outletCount: 22,
    healthScore: 88,
  },
  {
    id: 'del',
    name: 'Delhi Cluster',
    city: 'Delhi',
    x: 184,   // 28.65°N 77.22°E
    y: 198,
    status: 'Healthy',
    outletCount: 21,
    healthScore: 95,
  },
  {
    id: 'hyd',
    name: 'Hyderabad Cluster',
    city: 'Hyderabad',
    x: 212,   // 17.38°N 78.49°E
    y: 461,
    status: 'Healthy',
    outletCount: 16,
    healthScore: 90,
  },
  {
    id: 'chn',
    name: 'Chennai Cluster',
    city: 'Chennai',
    x: 250,   // 13.08°N 80.27°E
    y: 562,
    status: 'Healthy',
    outletCount: 15,
    healthScore: 91,
  },
  {
    id: 'pun',
    name: 'Pune Cluster',
    city: 'Pune',
    x: 112,   // 18.52°N 73.86°E
    y: 435,
    status: 'Healthy',
    outletCount: 12,
    healthScore: 89,
  },
  {
    id: 'ahm',
    name: 'Ahmedabad Cluster',
    city: 'Ahmedabad',
    x: 84,    // 23.02°N 72.57°E
    y: 330,
    status: 'Healthy',
    outletCount: 11,
    healthScore: 87,
  },
  {
    id: 'kol',
    name: 'Kolkata Cluster',
    city: 'Kolkata',
    x: 425,   // 22.57°N 88.36°E
    y: 340,
    status: 'Healthy',
    outletCount: 14,
    healthScore: 93,
  },
  {
    id: 'jai',
    name: 'Jaipur Cluster',
    city: 'Jaipur',
    x: 154,   // 26.91°N 75.82°E
    y: 238,
    status: 'Healthy',
    outletCount: 10,
    healthScore: 86,
  },
  {
    id: 'lko',
    name: 'Lucknow Cluster',
    city: 'Lucknow',
    x: 265,   // 26.85°N 80.95°E
    y: 240,
    status: 'Healthy',
    outletCount: 9,
    healthScore: 85,
  },
];

export type ActivityEvent = {
  id: string;
  time: string;
  title: string;
};

export const ACTIVITY_EVENTS: ActivityEvent[] = [
  { id: '1', time: '09:10', title: 'Morning shift started' },
  { id: '2', time: '09:35', title: 'Payroll approved' },
  { id: '3', time: '10:12', title: 'Outlet manager checked in' },
  { id: '4', time: '10:48', title: 'Inventory synced' },
];

export type AIInsight = {
  id: string;
  message: string;
  priority: 'High' | 'Medium' | 'Low';
};

export const AI_INSIGHTS: AIInsight[] = [
  {
    id: '1',
    message: 'Inventory running low in HSR',
    priority: 'High',
  },
  {
    id: '2',
    message: 'Labour cost increased 6%',
    priority: 'Medium',
  },
  {
    id: '3',
    message: 'Peak-hour staffing needs review',
    priority: 'Low',
  },
];

export const HEALTH_METRICS = [
  { id: 'attendance', label: 'Attendance', value: '96%' },
  { id: 'inventory', label: 'Inventory', value: '92%' },
  { id: 'tasks', label: 'Tasks', value: '88%' },
  { id: 'payroll', label: 'Payroll', value: '100%' },
  { id: 'staff', label: 'Staff On Shift', value: '142' },
  { id: 'outlets', label: 'Outlets Live', value: '18/18' },
];

export const SECTION_COPY = {
  eyebrow: 'LIVE OPERATIONS',
  heading: {
    line1: 'Monitor every outlet. Respond instantly.',
    line2: 'Grow confidently.',
    highlight: 'Grow confidently.',
  },
  description:
    'See every location on one live map: revenue, staff, tasks, and health scores updating in real time from your command center.',
};
