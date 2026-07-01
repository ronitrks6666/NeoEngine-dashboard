export type BillingCycle = 'monthly' | 'yearly';

export interface PricingState {
  outlets: number;
  employees: number;
  billingCycle: BillingCycle;
}

export interface PricingResult {
  monthlyCost: number;
  annualCost: number;
  yearlySavings: number;
  yearlyDiscountPercent: number;
  displayCycle: 'month' | 'year';
}

export interface ROIMetricResult {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: 'number' | 'currency' | 'percent';
}

export interface ROIResult {
  metrics: ROIMetricResult[];
  totalAnnualSavings: number;
}
