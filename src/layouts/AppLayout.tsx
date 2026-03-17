import { useEffect, useState, useRef } from 'react';
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { NeoEngineLogo } from '@/components/NeoEngineLogo';
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
];

export function AppLayout({ children, role }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { setOutlets, clear } = useOutletStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: ownerOutlets } = useQuery({
    queryKey: ['owner-outlets'],
    queryFn: ownerApi.getOutlets,
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

  const navItems = role === 'SUPER_ADMIN' ? superAdminNav : ownerNav;
  const basePath = role === 'SUPER_ADMIN' ? '/super-admin' : '/owner';
  const sidebarWidth = sidebarCollapsed ? 72 : 256;

  return (
    <div className="flex min-h-screen bg-emerald-50/40">
      <aside
        className="fixed left-0 top-0 z-40 h-screen flex flex-col bg-gradient-to-b from-emerald-800 to-emerald-900 shadow-emerald-lg transition-all duration-300 ease-in-out overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        <div className={`flex-shrink-0 flex items-center border-b border-emerald-700/50 min-h-[56px] transition-all duration-300 ${
          sidebarCollapsed ? 'justify-center' : 'justify-between px-2'
        }`}>
          {!sidebarCollapsed && (
            <Link to={`${basePath}/dashboard`} className="font-bold text-white text-xl truncate flex-1 min-w-0 flex items-center gap-2">
              <NeoEngineLogo size={28} className="shrink-0" />
              NeoEngine
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="flex-shrink-0 p-2 rounded-lg text-emerald-200 hover:bg-emerald-700/50 hover:text-white transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  sidebarCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'
                } ${
                  isActive ? 'bg-emerald-500/30 text-white' : 'text-emerald-100 hover:bg-emerald-700/50 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span
                  className={`whitespace-nowrap transition-all duration-300 ${
                    sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main
        className="flex-1 min-h-screen overflow-auto transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-emerald-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
          {role === 'OWNER' && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-emerald-800">Outlet:</span>
              <OutletSelector />
            </div>
          )}
          {role === 'SUPER_ADMIN' && <div />}
          <div className="relative ml-auto" ref={profileRef}>
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
