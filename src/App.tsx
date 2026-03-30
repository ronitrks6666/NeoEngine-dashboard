import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { LandingPage } from '@/pages/landing/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SetPasswordPage } from '@/pages/owner/SetPasswordPage';
import { SuperAdminDashboardPage } from '@/pages/super-admin/SuperAdminDashboardPage';
import { OwnersPage } from '@/pages/super-admin/OwnersPage';
import { OutletsPage } from '@/pages/super-admin/OutletsPage';
import { AnalyticsPage } from '@/pages/super-admin/AnalyticsPage';
import { OwnerDashboardPage } from '@/pages/owner/OwnerDashboardPage';
import { OwnerOutletsPage } from '@/pages/owner/OwnerOutletsPage';
import { StaffPage } from '@/pages/owner/StaffPage';
import { RolesPage } from '@/pages/owner/RolesPage';
import { TasksPage } from '@/pages/owner/TasksPage';
import { AttendancePage } from '@/pages/owner/AttendancePage';
import { LeavePage } from '@/pages/owner/LeavePage';
import { PayrollPage } from '@/pages/owner/PayrollPage';
import { AnalyticsPage as OwnerAnalyticsPage } from '@/pages/owner/AnalyticsPage';
import { BriefingPoolPage } from '@/pages/owner/BriefingPoolPage';
import { HierarchyPage } from '@/pages/owner/HierarchyPage';
import { ReportsPage } from '@/pages/owner/ReportsPage';
import { PermissionsPage } from '@/pages/owner/PermissionsPage';
import { useAuth } from '@/hooks/useAuth';
import { NeoEngineApkDownloadPage } from '@/pages/NeoEngineApkDownloadPage';

function App() {
  const { hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/owner/set-password"
        element={
          <ProtectedRoute allowedRoles={['OWNER']}>
            <SetPasswordPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/*"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <AppLayout role="SUPER_ADMIN">
              <Routes>
                <Route path="dashboard" element={<SuperAdminDashboardPage />} />
                <Route path="owners" element={<OwnersPage />} />
                <Route path="outlets" element={<OutletsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner/*"
        element={
          <ProtectedRoute allowedRoles={['OWNER']}>
            <AppLayout role="OWNER">
              <Routes>
                <Route path="dashboard" element={<OwnerDashboardPage />} />
                <Route path="outlets" element={<OwnerOutletsPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="leave" element={<LeavePage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="analytics" element={<OwnerAnalyticsPage />} />
                <Route path="briefing-pool" element={<BriefingPoolPage />} />
                <Route path="hierarchy" element={<HierarchyPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="permissions" element={<PermissionsPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<LandingPage />} />
      <Route path="/neoengine-apk" element={<NeoEngineApkDownloadPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
