import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { LandingPage } from '@/pages/landing/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SuperAdminLoginPage } from '@/pages/auth/SuperAdminLoginPage';
import { SetPasswordPage } from '@/pages/owner/SetPasswordPage';
import { SuperAdminDashboardPage } from '@/pages/super-admin/SuperAdminDashboardPage';
import { OwnersPage } from '@/pages/super-admin/OwnersPage';
import { OutletsPage } from '@/pages/super-admin/OutletsPage';
import { AnalyticsPage } from '@/pages/super-admin/AnalyticsPage';
import { SupportTicketsPage } from '@/pages/super-admin/SupportTicketsPage';
import { SalesLeadsPage } from '@/pages/super-admin/SalesLeadsPage';
import { AuditLogsPage } from '@/pages/super-admin/AuditLogsPage';
import { SubAdminsPage } from '@/pages/super-admin/SubAdminsPage';
import { SubscriptionsPage } from '@/pages/super-admin/SubscriptionsPage';
import { CouponsPage } from '@/pages/super-admin/CouponsPage';
import { SuperAdminPermissionRoute } from '@/components/SuperAdminPermissionRoute';
import { EmployeeWebPermissionRoute } from '@/components/EmployeeWebPermissionRoute';
import { SUPER_ADMIN_PERMISSIONS as P } from '@/constants/superAdminPermissions';
import { OwnerDashboardPage } from '@/pages/owner/OwnerDashboardPage';
import { OwnerSupportTicketsPage } from '@/pages/owner/OwnerSupportTicketsPage';
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
import { IssuesPage } from '@/pages/owner/IssuesPage';
import { OvertimePage } from '@/pages/owner/OvertimePage';
import { EventsPage } from '@/pages/owner/EventsPage';
import { ActivityPage } from '@/pages/owner/ActivityPage';
import { PayrollSettingsPage } from '@/pages/owner/PayrollSettingsPage';
import { LeaveRulesPage } from '@/pages/owner/LeaveRulesPage';
import { SopPage } from '@/pages/owner/SopPage';
import { DepartmentsPage } from '@/pages/owner/DepartmentsPage';
import { VendorsPage } from '@/pages/owner/VendorsPage';
import { DutyRosterPage } from '@/pages/owner/DutyRosterPage';
import { RulesRegulationsPage } from '@/pages/owner/RulesRegulationsPage';
import { OutletFeatureMenuPage } from '@/pages/super-admin/OutletFeatureMenuPage';
import { useAuth } from '@/hooks/useAuth';
import { getDefaultEmployeeDashboardPath } from '@/lib/webDashboardAccess';
import { NeoEngineApkDownloadPage } from '@/pages/NeoEngineApkDownloadPage';
import { PrivacyPolicyPage } from '@/pages/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/pages/legal/TermsOfServicePage';
import { AccountDeletionPage } from '@/pages/legal/AccountDeletionPage';
import { ContactPage } from '@/pages/legal/ContactPage';

function OwnerDefaultRedirect() {
  const { role, featurePermissions } = useAuth();
  if (role === 'EMPLOYEE') {
    return <Navigate to={getDefaultEmployeeDashboardPath(featurePermissions)} replace />;
  }
  return <Navigate to="dashboard" replace />;
}

function App() {
  const { hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />

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
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} loginPath="/super-admin/login">
            <AppLayout role="SUPER_ADMIN">
              <Routes>
                <Route path="dashboard" element={<SuperAdminDashboardPage />} />
                <Route
                  path="owners"
                  element={
                    <SuperAdminPermissionRoute permission={P.OWNERS_VIEW}>
                      <OwnersPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route
                  path="outlets"
                  element={
                    <SuperAdminPermissionRoute permission={P.OUTLETS_VIEW}>
                      <OutletsPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route
                  path="outlets/:outletId/features"
                  element={
                    <SuperAdminPermissionRoute permission={P.OUTLETS_VIEW}>
                      <OutletFeatureMenuPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route
                  path="subscriptions"
                  element={
                    <SuperAdminPermissionRoute permission={P.SUBSCRIPTIONS_VIEW}>
                      <SubscriptionsPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route
                  path="coupons"
                  element={
                    <SuperAdminPermissionRoute permission={P.COUPONS_VIEW}>
                      <CouponsPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route
                  path="sub-admins"
                  element={
                    <SuperAdminPermissionRoute permission={P.SUB_ADMINS_VIEW}>
                      <SubAdminsPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <SuperAdminPermissionRoute permission={P.ANALYTICS_VIEW}>
                      <AnalyticsPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route
                  path="support"
                  element={
                    <SuperAdminPermissionRoute permission={P.SUPPORT_VIEW}>
                      <SupportTicketsPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route
                  path="demo-requests"
                  element={
                    <SuperAdminPermissionRoute permission={P.SUPPORT_VIEW}>
                      <SalesLeadsPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <SuperAdminPermissionRoute permission={P.AUDIT_VIEW}>
                      <AuditLogsPage />
                    </SuperAdminPermissionRoute>
                  }
                />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner/*"
        element={
          <ProtectedRoute allowedRoles={['OWNER', 'EMPLOYEE']}>
            <AppLayout role="OWNER">
              <Routes>
                <Route
                  path="dashboard"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/dashboard">
                      <OwnerDashboardPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="outlets"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/outlets">
                      <OwnerOutletsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="staff"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/staff">
                      <StaffPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="roles"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/roles">
                      <RolesPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="departments"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/departments">
                      <DepartmentsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="vendors"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/vendors">
                      <VendorsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="sops"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/sops">
                      <SopPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="tasks"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/tasks">
                      <TasksPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="issues"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/issues">
                      <IssuesPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="attendance"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/attendance">
                      <AttendancePage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="overtime"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/overtime">
                      <OvertimePage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="leave"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/leave">
                      <LeavePage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="leave-rules"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/leave-rules">
                      <LeaveRulesPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="events"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/events">
                      <EventsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="payroll"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/payroll">
                      <PayrollPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="payroll-settings"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/payroll-settings">
                      <PayrollSettingsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="activity"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/activity">
                      <ActivityPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/analytics">
                      <OwnerAnalyticsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="briefing-pool"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/briefing-pool">
                      <BriefingPoolPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="hierarchy"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/hierarchy">
                      <HierarchyPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/reports">
                      <ReportsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="duty-roster"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/duty-roster">
                      <DutyRosterPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="rules-regulations"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/rules-regulations">
                      <RulesRegulationsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="permissions"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/permissions">
                      <PermissionsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route
                  path="support"
                  element={
                    <EmployeeWebPermissionRoute routePath="/owner/support">
                      <OwnerSupportTicketsPage />
                    </EmployeeWebPermissionRoute>
                  }
                />
                <Route path="" element={<OwnerDefaultRedirect />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/account-deletion" element={<AccountDeletionPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/neoengine-apk" element={<NeoEngineApkDownloadPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

