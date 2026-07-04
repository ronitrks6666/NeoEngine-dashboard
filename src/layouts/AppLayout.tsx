import { useEffect, useState, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOutletStore } from '@/stores/outletStore';
import { OutletSelector } from '@/components/OutletSelector';
import { ownerApi } from '@/api/owner';
import { CoBrandMark } from '@/components/CoBrandMark';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  Store,
  BarChart3,
  UserCog,
  CheckSquare,
  CalendarCheck,
  MessageSquare,
  GitBranch,
  CalendarDays,
  Wallet,
  FileText,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  AlertTriangle,
  Clock,
  CalendarPlus,
  Activity,
  Settings,
  BookOpen,
  Headset,
  ClipboardList,
  CreditCard,
  Gift,
  Building2,
  CalendarClock,
  ScrollText,
  Phone,
  SlidersHorizontal,
} from 'lucide-react';

import { NeoEngineLogo } from '@/components/NeoEngineLogo';
import { SiteSearchTypeahead } from '@/components/SiteSearchTypeahead';
import { useHighlightSection } from '@/hooks/useHighlightSection';
import { useSuperAdminPermissions } from '@/hooks/useSuperAdminPermissions';
import { filterOwnerNavForEmployee } from '@/lib/webDashboardAccess';
import { applyOwnerNavPreferences, type OwnerNavItem } from '@/lib/featureMenu';
import { canAccessWebFeatureMenu } from '@/lib/featureMenuAccess';
import { SUPER_ADMIN_PERMISSIONS as P } from '@/constants/superAdminPermissions';
import type { SuperAdminPermission } from '@/constants/superAdminPermissions';
import type { LucideIcon } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  role: 'SUPER_ADMIN' | 'OWNER';
}

const superAdminNav: { to: string; label: string; icon: LucideIcon; permission?: SuperAdminPermission }[] = [
  { to: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: P.DASHBOARD_VIEW },
  { to: '/super-admin/owners', label: 'Owners', icon: Users, permission: P.OWNERS_VIEW },
  { to: '/super-admin/outlets', label: 'Outlets', icon: Store, permission: P.OUTLETS_VIEW },
  { to: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard, permission: P.SUBSCRIPTIONS_VIEW },
  { to: '/super-admin/coupons', label: 'Coupons', icon: Gift, permission: P.COUPONS_VIEW },
  { to: '/super-admin/sub-admins', label: 'Sub Admins', icon: Shield, permission: P.SUB_ADMINS_VIEW },
  { to: '/super-admin/support', label: 'Support Tickets', icon: Headset, permission: P.SUPPORT_VIEW },
  { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: ClipboardList, permission: P.AUDIT_VIEW },
  { to: '/super-admin/analytics', label: 'Analytics', icon: BarChart3, permission: P.ANALYTICS_VIEW },
];

const ownerNav: OwnerNavItem[] = [
  { key: 'dashboard', to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'tasks', to: '/owner/tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'sops', to: '/owner/sops', label: 'SOPs', icon: BookOpen },
  { key: 'issues', to: '/owner/issues', label: 'Issues', icon: AlertTriangle },
  { key: 'staff', to: '/owner/staff', label: 'Staff', icon: Users },
  { key: 'payroll', to: '/owner/payroll', label: 'Payroll', icon: Wallet },
  { key: 'events', to: '/owner/events', label: 'Events', icon: CalendarPlus },
  { key: 'briefing-pool', to: '/owner/briefing-pool', label: 'Briefing Pool', icon: MessageSquare },
  { key: 'analytics', to: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'reports', to: '/owner/reports', label: 'Reports', icon: FileText },
  { key: 'attendance', to: '/owner/attendance', label: 'Attendance', icon: CalendarCheck },
  { key: 'duty-roster', to: '/owner/duty-roster', label: 'Duty Roster', icon: CalendarClock },
  { key: 'leave', to: '/owner/leave', label: 'Leave', icon: CalendarDays },
  { key: 'leave-rules', to: '/owner/leave-rules', label: 'Leave Rules', icon: BookOpen },
  { key: 'payroll-settings', to: '/owner/payroll-settings', label: 'Pay Settings', icon: Settings },
  { key: 'overtime', to: '/owner/overtime', label: 'Overtime', icon: Clock },
  { key: 'hierarchy', to: '/owner/hierarchy', label: 'Hierarchy', icon: GitBranch },
  { key: 'permissions', to: '/owner/permissions', label: 'Permissions', icon: Shield },
  { key: 'activity', to: '/owner/activity', label: 'Activity', icon: Activity },
  { key: 'roles', to: '/owner/roles', label: 'Roles', icon: UserCog },
  { key: 'departments', to: '/owner/departments', label: 'Departments', icon: Building2 },
  { key: 'vendors', to: '/owner/vendors', label: 'Vendors', icon: Phone },
  { key: 'outlets', to: '/owner/outlets', label: 'Outlets', icon: Store },
  {
    key: 'features',
    to: '/owner/features',
    label: 'Features',
    icon: SlidersHorizontal,
    locked: true,
  },
  { key: 'rules-regulations', to: '/owner/rules-regulations', label: 'Rules & Regs', icon: ScrollText },
  { key: 'support', to: '/owner/support', label: 'Support', icon: Headset },
];

type SidebarFlyout =
  | { type: 'nav'; label: string; left: number; top: number }
  | { type: 'expand'; left: number; top: number }
  | null;

function SidebarFlyoutLayer({ flyout }: { flyout: SidebarFlyout }) {
  if (typeof document === 'undefined' || !flyout) return null;

  const label = flyout.type === 'expand' ? 'Expand menu' : flyout.label;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] animate-fade-in"
      style={{
        left: flyout.left,
        top: flyout.top,
        transform: 'translateY(-50%)',
      }}
      role="tooltip"
    >
      <div className="relative flex items-center">
        <span
          className="absolute right-full top-1/2 mr-[-1px] h-0 w-0 -translate-y-1/2 border-y-[7px] border-r-[8px] border-y-transparent border-r-white drop-shadow-sm"
          aria-hidden
        />
        <span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold tracking-tight text-emerald-900 shadow-lg shadow-emerald-950/25 ring-1 ring-emerald-100">
          {label}
        </span>
      </div>
    </div>,
    document.body
  );
}

function HeaderProfileMenu({
  profileRef,
  profileOpen,
  setProfileOpen,
  userName,
  userEmail,
  onLogout,
}: {
  profileRef: RefObject<HTMLDivElement | null>;
  profileOpen: boolean;
  setProfileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
}) {
  return (
    <div className="relative shrink-0" ref={profileRef}>
      <button
        type="button"
        onClick={() => setProfileOpen((o) => !o)}
        className="flex items-center gap-2 p-2 rounded-full hover:bg-emerald-50 transition-colors"
        aria-label="Profile menu"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-emerald">
          <User className="h-5 w-5 text-white" />
        </div>
      </button>
      {profileOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-emerald-lg border border-emerald-100 py-2 animate-fade-in z-50">
          <div className="px-4 py-3 border-b border-emerald-50">
            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-emerald-600 truncate">{userEmail}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children, role }: AppLayoutProps) {
  const {
    user,
    role: authRole,
    featurePermissions,
    logout,
    refreshSuperAdminProfile,
    refreshEmployeeSession,
  } = useAuth();
  const { can } = useSuperAdminPermissions();
  const { setOutlets, clear } = useOutletStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarFlyout, setSidebarFlyout] = useState<SidebarFlyout>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: merchantOutlets } = useQuery({
    queryKey: ['owner-outlets', authRole],
    queryFn: () => ownerApi.getOutlets(),
    enabled: authRole === 'OWNER' || authRole === 'EMPLOYEE',
  });

  const { data: ownerBrand } = useQuery({
    queryKey: ['owner-brand'],
    queryFn: () => ownerApi.getBrand(),
    enabled: role === 'OWNER',
  });

  const { data: featureMenu } = useQuery({
    queryKey: ['owner-feature-menu'],
    queryFn: () => ownerApi.getFeatureMenu(),
    enabled: canAccessWebFeatureMenu(authRole, featurePermissions),
  });

  useEffect(() => {
    if ((authRole === 'OWNER' || authRole === 'EMPLOYEE') && merchantOutlets) {
      setOutlets(merchantOutlets.map((o) => ({ _id: o._id, name: o.name })));
    }
    if (role === 'SUPER_ADMIN') clear();
  }, [authRole, role, merchantOutlets, setOutlets, clear]);
  const navigate = useNavigate();
  const location = useLocation();
  useHighlightSection();

  const handleLogout = () => {
    setProfileOpen(false);
    const wasSuperAdmin = role === 'SUPER_ADMIN';
    logout();
    navigate(wasSuperAdmin ? '/super-admin/login' : '/login');
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!sidebarCollapsed) setSidebarFlyout(null);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      void refreshSuperAdminProfile();
    }
    if (authRole === 'EMPLOYEE') {
      void refreshEmployeeSession();
    }
  }, [role, authRole, refreshSuperAdminProfile, refreshEmployeeSession]);

  const isMerchantPortal = authRole === 'OWNER' || authRole === 'EMPLOYEE';
  const ownerNavFiltered = filterOwnerNavForEmployee(ownerNav, featurePermissions ?? null, authRole);
  const ownerNavWithPrefs =
    canAccessWebFeatureMenu(authRole, featurePermissions) && featureMenu?.webNav?.items
      ? applyOwnerNavPreferences(ownerNavFiltered, featureMenu.webNav.items)
      : ownerNavFiltered;
  const navItems =
    role === 'SUPER_ADMIN'
      ? superAdminNav.filter((item) => !item.permission || can(item.permission))
      : ownerNavWithPrefs;
  const basePath = role === 'SUPER_ADMIN' ? '/super-admin' : '/owner';
  const sidebarWidth = sidebarCollapsed ? 72 : 256;
  const dashboardPath =
    authRole === 'EMPLOYEE'
      ? navItems[0]?.to ?? '/owner/dashboard'
      : `${basePath}/dashboard`;

  const userEmail = user && 'email' in user ? user.email : '';

  const showNavFlyout = (el: HTMLElement, label: string) => {
    const r = el.getBoundingClientRect();
    setSidebarFlyout({ type: 'nav', label, left: r.right + 10, top: r.top + r.height / 2 });
  };

  const showExpandFlyout = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setSidebarFlyout({ type: 'expand', left: r.right + 10, top: r.top + r.height / 2 });
  };

  return (
    <div className="flex min-h-screen bg-emerald-50/40">
      <SidebarFlyoutLayer flyout={sidebarCollapsed ? sidebarFlyout : null} />
      <aside
        className="fixed left-0 top-0 z-40 flex h-screen flex-col overflow-x-visible overflow-y-hidden bg-gradient-to-b from-emerald-800 to-emerald-900 shadow-emerald-lg transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarWidth }}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          onMouseEnter={(e) => {
            if (sidebarCollapsed) showExpandFlyout(e.currentTarget);
          }}
          onMouseLeave={() => setSidebarFlyout(null)}
          onFocus={(e) => {
            if (sidebarCollapsed) showExpandFlyout(e.currentTarget);
          }}
          onBlur={() => setSidebarFlyout(null)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="fixed top-1/2 z-[45] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-emerald-200/90 border-l-0 bg-white text-emerald-700 shadow-md shadow-emerald-900/15 transition-[left,box-shadow] duration-300 ease-in-out hover:bg-emerald-50 hover:shadow-lg hover:shadow-emerald-900/12"
          style={{ left: sidebarWidth }}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5 shrink-0" />
          ) : (
            <ChevronLeft className="h-5 w-5 shrink-0" />
          )}
        </button>

        <nav className="sidebar-nav-scroll flex min-h-0 flex-1 flex-col space-y-0.5 overflow-y-auto overflow-x-visible p-2">
          <Link
            to={dashboardPath}
            onMouseEnter={(e) => {
              if (sidebarCollapsed) showNavFlyout(e.currentTarget, 'NeoEngine');
            }}
            onMouseLeave={() => setSidebarFlyout(null)}
            onFocus={(e) => {
              if (sidebarCollapsed) showNavFlyout(e.currentTarget, 'NeoEngine');
            }}
            onBlur={() => setSidebarFlyout(null)}
            className={
              sidebarCollapsed
                ? 'relative inline-flex shrink-0 items-center justify-center self-center rounded-lg px-2 py-3 text-emerald-100 transition-colors duration-200 hover:bg-emerald-700/50 hover:text-white'
                : 'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-100 transition-colors duration-200 hover:bg-emerald-700/50 hover:text-white'
            }
            aria-label="NeoEngine home"
          >
            <NeoEngineLogo size={28} className="shrink-0" />
            {!sidebarCollapsed && (
              <span className="truncate text-lg font-bold">NeoEngine</span>
            )}
          </Link>
          <div className="mx-1 mb-0.5 shrink-0 border-b border-emerald-700/50" aria-hidden />

          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onMouseEnter={(e) => {
                  if (sidebarCollapsed) showNavFlyout(e.currentTarget, item.label);
                }}
                onMouseLeave={() => setSidebarFlyout(null)}
                onFocus={(e) => {
                  if (sidebarCollapsed) showNavFlyout(e.currentTarget, item.label);
                }}
                onBlur={() => setSidebarFlyout(null)}
                className={`relative flex items-center rounded-lg text-sm font-medium transition-colors duration-200 ${
                  sidebarCollapsed
                    ? 'justify-center gap-0 px-2 py-3'
                    : 'gap-3 px-3 py-2.5'
                } ${
                  isActive ? 'bg-emerald-500/30 text-white' : 'text-emerald-100 hover:bg-emerald-700/50 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main
        className="flex-1 min-h-screen overflow-auto transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <header className="sticky top-0 z-30 relative flex h-14 shrink-0 items-center gap-3 border-b border-emerald-100 bg-white/90 px-4 shadow-sm backdrop-blur-md sm:px-6">
          {isMerchantPortal && (
            <>
              <div className="flex min-w-0 flex-1 items-center justify-start">
                <OutletSelector allowCreate={authRole === 'OWNER'} className="max-w-[min(100%,14rem)]" />
              </div>

              <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
                <CoBrandMark brand={ownerBrand ?? null} variant="header" logoSize={28} />
              </div>

              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
                <SiteSearchTypeahead
                  role="OWNER"
                  className="w-full max-w-[11rem] sm:max-w-xs md:max-w-sm"
                />
                <HeaderProfileMenu
                  profileRef={profileRef}
                  profileOpen={profileOpen}
                  setProfileOpen={setProfileOpen}
                  userName={user?.name}
                  userEmail={userEmail}
                  onLogout={handleLogout}
                />
              </div>
            </>
          )}
          {role === 'SUPER_ADMIN' && (
            <>
              <div className="flex min-w-0 flex-1 items-center justify-start">
                <SiteSearchTypeahead role="SUPER_ADMIN" className="w-full max-w-md" />
              </div>
              <HeaderProfileMenu
                profileRef={profileRef}
                profileOpen={profileOpen}
                setProfileOpen={setProfileOpen}
                userName={user?.name}
                userEmail={userEmail}
                onLogout={handleLogout}
              />
            </>
          )}
        </header>
        {children}
      </main>
    </div>
  );
}
