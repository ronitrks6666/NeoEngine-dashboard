import {
  ALL_SUPER_ADMIN_PERMISSIONS,
  PERMISSION_LABELS,
  SUPER_ADMIN_PERMISSIONS,
} from './superAdminPermissions';

/** Mirrors backend SUB_ADMIN_ROLE_TEMPLATES — also available via API */
export const SUB_ADMIN_ROLE_TEMPLATES = [
  {
    key: 'sales_rep',
    name: 'Sales Representative',
    description:
      'Onboard owners & outlets, manage subscriptions, view personal sales stats (onboarded, paid, trials).',
    permissions: [
      SUPER_ADMIN_PERMISSIONS.DASHBOARD_VIEW,
      SUPER_ADMIN_PERMISSIONS.OWNERS_VIEW,
      SUPER_ADMIN_PERMISSIONS.OWNERS_CREATE,
      SUPER_ADMIN_PERMISSIONS.OUTLETS_VIEW,
      SUPER_ADMIN_PERMISSIONS.OUTLETS_CREATE,
      SUPER_ADMIN_PERMISSIONS.SUBSCRIPTIONS_VIEW,
      SUPER_ADMIN_PERMISSIONS.SUBSCRIPTIONS_MANAGE,
      SUPER_ADMIN_PERMISSIONS.COUPONS_VIEW,
      SUPER_ADMIN_PERMISSIONS.SALES_PERFORMANCE_VIEW,
    ],
  },
  {
    key: 'onboarding_specialist',
    name: 'Onboarding Specialist',
    description: 'Create owners/outlets and assign trials — no subscription edits.',
    permissions: [
      SUPER_ADMIN_PERMISSIONS.DASHBOARD_VIEW,
      SUPER_ADMIN_PERMISSIONS.OWNERS_VIEW,
      SUPER_ADMIN_PERMISSIONS.OWNERS_CREATE,
      SUPER_ADMIN_PERMISSIONS.OUTLETS_VIEW,
      SUPER_ADMIN_PERMISSIONS.OUTLETS_CREATE,
      SUPER_ADMIN_PERMISSIONS.SUBSCRIPTIONS_VIEW,
      SUPER_ADMIN_PERMISSIONS.COUPONS_VIEW,
      SUPER_ADMIN_PERMISSIONS.SALES_PERFORMANCE_VIEW,
    ],
  },
  {
    key: 'support_staff',
    name: 'Support Staff',
    description: 'Handle support tickets; read owners & outlets for debugging.',
    permissions: [
      SUPER_ADMIN_PERMISSIONS.DASHBOARD_VIEW,
      SUPER_ADMIN_PERMISSIONS.SUPPORT_VIEW,
      SUPER_ADMIN_PERMISSIONS.SUPPORT_MANAGE,
      SUPER_ADMIN_PERMISSIONS.OWNERS_VIEW,
      SUPER_ADMIN_PERMISSIONS.OUTLETS_VIEW,
      SUPER_ADMIN_PERMISSIONS.AUDIT_VIEW,
    ],
  },
  {
    key: 'billing_manager',
    name: 'Billing Manager',
    description: 'Subscriptions, coupons, and revenue analytics.',
    permissions: [
      SUPER_ADMIN_PERMISSIONS.DASHBOARD_VIEW,
      SUPER_ADMIN_PERMISSIONS.SUBSCRIPTIONS_VIEW,
      SUPER_ADMIN_PERMISSIONS.SUBSCRIPTIONS_MANAGE,
      SUPER_ADMIN_PERMISSIONS.COUPONS_VIEW,
      SUPER_ADMIN_PERMISSIONS.COUPONS_MANAGE,
      SUPER_ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    ],
  },
  {
    key: 'platform_analyst',
    name: 'Platform Analyst',
    description: 'Read-only across owners, outlets, subscriptions, analytics.',
    permissions: [
      SUPER_ADMIN_PERMISSIONS.DASHBOARD_VIEW,
      SUPER_ADMIN_PERMISSIONS.ANALYTICS_VIEW,
      SUPER_ADMIN_PERMISSIONS.OWNERS_VIEW,
      SUPER_ADMIN_PERMISSIONS.OUTLETS_VIEW,
      SUPER_ADMIN_PERMISSIONS.SUBSCRIPTIONS_VIEW,
      SUPER_ADMIN_PERMISSIONS.AUDIT_VIEW,
    ],
  },
  {
    key: 'impersonation_ops',
    name: 'Ops / Impersonation',
    description: 'Impersonate owners for debugging; view support & audit.',
    permissions: [
      SUPER_ADMIN_PERMISSIONS.DASHBOARD_VIEW,
      SUPER_ADMIN_PERMISSIONS.OWNERS_VIEW,
      SUPER_ADMIN_PERMISSIONS.OWNERS_IMPERSONATE,
      SUPER_ADMIN_PERMISSIONS.OUTLETS_VIEW,
      SUPER_ADMIN_PERMISSIONS.SUPPORT_VIEW,
      SUPER_ADMIN_PERMISSIONS.AUDIT_VIEW,
    ],
  },
  {
    key: 'team_manager',
    name: 'Team Manager',
    description: 'Manage sub admins and view team sales performance.',
    permissions: [
      SUPER_ADMIN_PERMISSIONS.DASHBOARD_VIEW,
      SUPER_ADMIN_PERMISSIONS.SUB_ADMINS_VIEW,
      SUPER_ADMIN_PERMISSIONS.SUB_ADMINS_MANAGE,
      SUPER_ADMIN_PERMISSIONS.SALES_PERFORMANCE_VIEW,
      SUPER_ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    ],
  },
] as const;

export type PermissionSetupMode = 'template' | 'custom' | 'clone';

export function templateLabel(key?: string): string {
  if (!key || key === 'custom') return 'Custom';
  if (key.startsWith('clone:')) return 'Cloned role';
  return SUB_ADMIN_ROLE_TEMPLATES.find((t) => t.key === key)?.name || key;
}

export function permissionsForTemplate(key: string): string[] {
  const tpl = SUB_ADMIN_ROLE_TEMPLATES.find((t) => t.key === key);
  return tpl ? [...tpl.permissions] : [];
}

export { ALL_SUPER_ADMIN_PERMISSIONS, PERMISSION_LABELS };
