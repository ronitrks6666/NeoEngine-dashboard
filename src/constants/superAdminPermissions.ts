export const SUPER_ADMIN_PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  OWNERS_VIEW: 'owners.view',
  OWNERS_CREATE: 'owners.create',
  OWNERS_IMPERSONATE: 'owners.impersonate',
  OUTLETS_VIEW: 'outlets.view',
  OUTLETS_CREATE: 'outlets.create',
  SUBSCRIPTIONS_VIEW: 'subscriptions.view',
  SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
  COUPONS_VIEW: 'coupons.view',
  COUPONS_MANAGE: 'coupons.manage',
  SUPPORT_VIEW: 'support.view',
  SUPPORT_MANAGE: 'support.manage',
  AUDIT_VIEW: 'audit.view',
  ANALYTICS_VIEW: 'analytics.view',
  SUB_ADMINS_VIEW: 'sub_admins.view',
  SUB_ADMINS_MANAGE: 'sub_admins.manage',
  MOBILE_CONFIG: 'mobile_config.manage',
  SALES_PERFORMANCE_VIEW: 'sales.performance.view',
} as const;

export type SuperAdminPermission =
  (typeof SUPER_ADMIN_PERMISSIONS)[keyof typeof SUPER_ADMIN_PERMISSIONS];

export const PERMISSION_LABELS: Record<SuperAdminPermission, string> = {
  [SUPER_ADMIN_PERMISSIONS.DASHBOARD_VIEW]: 'View dashboard',
  [SUPER_ADMIN_PERMISSIONS.OWNERS_VIEW]: 'View owners',
  [SUPER_ADMIN_PERMISSIONS.OWNERS_CREATE]: 'Create owners',
  [SUPER_ADMIN_PERMISSIONS.OWNERS_IMPERSONATE]: 'Impersonate owners',
  [SUPER_ADMIN_PERMISSIONS.OUTLETS_VIEW]: 'View outlets',
  [SUPER_ADMIN_PERMISSIONS.OUTLETS_CREATE]: 'Create outlets',
  [SUPER_ADMIN_PERMISSIONS.SUBSCRIPTIONS_VIEW]: 'View subscriptions',
  [SUPER_ADMIN_PERMISSIONS.SUBSCRIPTIONS_MANAGE]: 'Manage subscriptions',
  [SUPER_ADMIN_PERMISSIONS.COUPONS_VIEW]: 'View coupons',
  [SUPER_ADMIN_PERMISSIONS.COUPONS_MANAGE]: 'Manage coupons',
  [SUPER_ADMIN_PERMISSIONS.SUPPORT_VIEW]: 'View support tickets',
  [SUPER_ADMIN_PERMISSIONS.SUPPORT_MANAGE]: 'Manage support tickets',
  [SUPER_ADMIN_PERMISSIONS.AUDIT_VIEW]: 'View audit logs',
  [SUPER_ADMIN_PERMISSIONS.ANALYTICS_VIEW]: 'View analytics',
  [SUPER_ADMIN_PERMISSIONS.SUB_ADMINS_VIEW]: 'View sub admins',
  [SUPER_ADMIN_PERMISSIONS.SUB_ADMINS_MANAGE]: 'Manage sub admins',
  [SUPER_ADMIN_PERMISSIONS.MOBILE_CONFIG]: 'Mobile app config',
  [SUPER_ADMIN_PERMISSIONS.SALES_PERFORMANCE_VIEW]: 'View sales performance (own or team)',
};

export const ALL_SUPER_ADMIN_PERMISSIONS = Object.values(SUPER_ADMIN_PERMISSIONS);
