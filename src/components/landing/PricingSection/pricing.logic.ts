import type { PricingResult, PricingState, ROIResult } from './pricing.types';

/** Isolated pricing constants — adjust here without touching UI */
const BASE_PLAN_STAFF = 20;
const BASE_PLAN_MONTHLY = 999;
const PER_STAFF_MONTHLY = 49;
const YEARLY_DISCOUNT = 0.13;

const ROI_HOURS_PER_EMPLOYEE_MONTH = 0.65;
const ROI_PAYROLL_SAVING_PER_EMPLOYEE_MONTH = 145;
const ROI_INVENTORY_SAVING_PER_OUTLET_MONTH = 12_500;
const ROI_PRODUCTIVITY_PERCENT_BASE = 18;
const ROI_PRODUCTIVITY_PER_OUTLET = 2.5;

function calculateRawMonthly(employees: number): number {
  if (employees <= BASE_PLAN_STAFF) {
    return BASE_PLAN_MONTHLY;
  }
  const additionalStaff = employees - BASE_PLAN_STAFF;
  return BASE_PLAN_MONTHLY + additionalStaff * PER_STAFF_MONTHLY;
}

export function calculatePricing(state: PricingState): PricingResult {
  const rawMonthly = calculateRawMonthly(state.employees);

  const monthlyCost =
    state.billingCycle === 'yearly' ? rawMonthly * (1 - YEARLY_DISCOUNT) : rawMonthly;

  const annualCost =
    state.billingCycle === 'yearly' ? monthlyCost * 12 : rawMonthly * 12;

  const yearlySavings = rawMonthly * 12 - annualCost;

  return {
    monthlyCost: Math.round(monthlyCost),
    annualCost: Math.round(annualCost),
    yearlySavings: Math.round(yearlySavings),
    yearlyDiscountPercent: Math.round(YEARLY_DISCOUNT * 100),
    displayCycle: 'month',
  };
}

export function calculateROI(state: PricingState): ROIResult {
  const hoursSaved = Math.round(
    state.employees * ROI_HOURS_PER_EMPLOYEE_MONTH * 12 * Math.max(1, state.outlets * 0.35),
  );

  const payrollErrorsReduced = Math.round(
    state.employees * ROI_PAYROLL_SAVING_PER_EMPLOYEE_MONTH * 12,
  );

  const inventoryLossReduced = Math.round(
    state.outlets * ROI_INVENTORY_SAVING_PER_OUTLET_MONTH * 12,
  );

  const managerProductivity = Math.round(
    ROI_PRODUCTIVITY_PERCENT_BASE + state.outlets * ROI_PRODUCTIVITY_PER_OUTLET,
  );

  const totalAnnualSavings =
    payrollErrorsReduced + inventoryLossReduced + hoursSaved * 450;

  return {
    metrics: [
      {
        id: 'hours',
        label: 'Hours Saved',
        value: hoursSaved,
        suffix: ' hrs',
        format: 'number',
      },
      {
        id: 'payroll',
        label: 'Payroll Errors Reduced',
        value: payrollErrorsReduced,
        prefix: '₹',
        format: 'currency',
      },
      {
        id: 'inventory',
        label: 'Inventory Loss Reduced',
        value: inventoryLossReduced,
        prefix: '₹',
        format: 'currency',
      },
      {
        id: 'productivity',
        label: 'Manager Productivity',
        value: managerProductivity,
        prefix: '+',
        suffix: '%',
        format: 'percent',
      },
    ],
    totalAnnualSavings: Math.round(totalAnnualSavings),
  };
}

export function formatCurrency(amount: number): string {
  if (amount >= 100_000) {
    return `₹${(amount / 100_000).toFixed(1)}L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatROIValue(
  value: number,
  prefix = '',
  suffix = '',
  format: 'number' | 'currency' | 'percent' = 'number',
): string {
  if (format === 'currency') {
    return formatCurrency(value);
  }
  if (format === 'percent') {
    return `${prefix}${Math.round(value)}${suffix}`;
  }
  return `${prefix}${value.toLocaleString('en-IN')}${suffix}`;
}
