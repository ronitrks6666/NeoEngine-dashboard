import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOutletStore } from '@/stores/outletStore';
import { OutletSelector } from '@/components/OutletSelector';
import { ownerApi } from '@/api/owner';
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
} from 'lucide-react';
import { NeoEngineLogo } from '@/components/NeoEngineLogo';
import { DashboardVoiceButton } from '@/components/DashboardVoiceButton';
import { SiteSearchTypeahead } from '@/components/SiteSearchTypeahead';
import { useHighlightSection } from '@/hooks/useHighlightSection';
import type { LucideIcon } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  role: 'SUPER_ADMIN' | 'OWNER';
}

const superAdminNav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/super-admin/owners', label: 'Owners', icon: Users },
  { to: '/super-admin/outlets', label: 'Outlets', icon: Store },
  { to: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const ownerNav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owner/outlets', label: 'Outlets', icon: Store },
  { to: '/owner/staff', label: 'Staff', icon: Users },
  { to: '/owner/roles', label: 'Roles', icon: UserCog },
  { to: '/owner/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/owner/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/owner/briefing-pool', label: 'Briefing Pool', icon: MessageSquare },
  { to: '/owner/hierarchy', label: 'Hierarchy', icon: GitBranch },
  { to: '/owner/leave', label: 'Leave', icon: CalendarDays },
  { to: '/owner/payroll', label: 'Payroll', icon: Wallet },
  { to: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/owner/reports', label: 'Reports', icon: FileText },
  { to: '/owner/permissions', label: 'Permissions', icon: Shield },
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

export function AppLayout({ children, role }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { selectedOutletId, setOutlets, clear } = useOutletStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarFlyout, setSidebarFlyout] = useState<SidebarFlyout>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: ownerOutlets } = useQuery({
    queryKey: ['owner-outlets'],
    queryFn: () => ownerApi.getOutlets(),
    enabled: role === 'OWNER',
  });

  useEffect(() => {
    if (role === 'OWNER' && ownerOutlets) {
      setOutlets(ownerOutlets.map((o) => ({ _id: o._id, name: o.name })));
    }
    if (role === 'SUPER_ADMIN') clear();
  }, [role, ownerOutlets, setOutlets, clear]);
  const navigate = useNavigate();
  const location = useLocation();
  useHighlightSection();

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
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

  const navItems = role === 'SUPER_ADMIN' ? superAdminNav : ownerNav;
  const basePath = role === 'SUPER_ADMIN' ? '/super-admin' : '/owner';
  const sidebarWidth = sidebarCollapsed ? 72 : 256;
  const dashboardPath = `${basePath}/dashboard`;

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
            {/* Same size in both states — avoids flicker during drawer width transition */}
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
        <header className="sticky top-0 z-30 min-h-[3.5rem] shrink-0 bg-white/90 backdrop-blur-md border-b border-emerald-100 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shadow-sm">
          {role === 'OWNER' && (
            <div className="flex min-h-0 flex-1 flex-wrap items-center gap-3 sm:gap-4 min-w-0">
              <span className="shrink-0 text-sm font-medium leading-none text-emerald-800">Outlet:</span>
              <OutletSelector />
              <DashboardVoiceButton
                outletId={selectedOutletId}
                onResult={(result) => {
                  const url = result.sectionId ? `${result.route}?highlight=${result.sectionId}` : result.route;
                  if (result.action === 'create_task' && result.prefilledData) {
                    navigate(url, { state: { openCreate: true, prefilledTask: result.prefilledData } });
                  } else if (result.action === 'create_staff' && result.prefilledData) {
                    navigate(url, { state: { openCreate: true, prefilledStaff: result.prefilledData } });
                  } else {
                    navigate(url);
                  }
                }}
                onError={(err) => {
                  window.alert(err || 'Voice processing failed. Try: "Show staff", "Create a task to...", etc.');
                }}
              />
              <SiteSearchTypeahead
                role="OWNER"
                className="w-full basis-full sm:basis-auto sm:ml-auto sm:max-w-xs md:max-w-sm lg:max-w-md"
              />
            </div>
          )}
          {role === 'SUPER_ADMIN' && (
            <div className="flex min-w-0 flex-1 items-center justify-start px-0 sm:px-2">
              <SiteSearchTypeahead role="SUPER_ADMIN" className="w-full max-w-md" />
            </div>
          )}
          <div className="relative ml-auto shrink-0" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-emerald-50 transition-colors"
              aria-label="Profile menu"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-emerald">
                <User className="h-5 w-5 text-white" />
              </div>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-emerald-lg border border-emerald-100 py-2 animate-fade-in">
                <div className="px-4 py-3 border-b border-emerald-50">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-emerald-600 truncate">{user && 'email' in user ? user.email : ''}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
