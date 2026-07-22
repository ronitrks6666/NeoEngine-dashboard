import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/admin';
import {
  Users,
  Store,
  Sparkles,
  CreditCard,
  Gift,
  TrendingUp,
  Clock,
  IndianRupee,
  Phone,
} from 'lucide-react';
import { format } from 'date-fns';
import { billingCycleLabel } from '@/lib/billing';
import { useSuperAdminPermissions } from '@/hooks/useSuperAdminPermissions';
import { SUPER_ADMIN_PERMISSIONS as P } from '@/constants/superAdminPermissions';

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    trial: 'bg-sky-100 text-sky-800 ring-sky-200',
    active: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    past_due: 'bg-amber-100 text-amber-900 ring-amber-200',
    cancelled: 'bg-gray-100 text-gray-700 ring-gray-200',
    free: 'bg-violet-100 text-violet-800 ring-violet-200',
    paid: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    unpaid: 'bg-red-100 text-red-800 ring-red-200',
  };
  const cls = styles[value] || 'bg-gray-100 text-gray-700 ring-gray-200';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}>
      {value.replace('_', ' ')}
    </span>
  );
}

export function SuperAdminDashboardPage() {
  const { can } = useSuperAdminPermissions();
  const canViewLeads = can(P.SUPPORT_VIEW);

  const { data, isLoading, error } = useQuery({
    queryKey: ['super-admin-dashboard-overview'],
    queryFn: adminApi.getDashboardOverview,
  });

  const { data: salesLeads = [] } = useQuery({
    queryKey: ['admin-sales-leads'],
    queryFn: adminApi.getSalesLeads,
    enabled: canViewLeads,
  });

  const recentLeads = salesLeads.slice(0, 5);
  const newLeadCount = salesLeads.filter((l) => l.status === 'New').length;

  if (isLoading) {
    return (
      <div className="p-8 animate-pulse space-y-6">
        <div className="h-10 w-64 bg-emerald-100 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-emerald-50" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">Failed to load dashboard</div>;
  }

  const summary = data?.subscriptionSummary ?? {};
  const plan = data?.plans?.[0];

  const kpiCards = [
    {
      label: 'Total owners',
      value: data?.totalOwners ?? 0,
      sub: `${data?.recentOwnersCount ?? 0} new (30d)`,
      icon: Users,
      gradient: 'from-emerald-600 to-teal-600',
    },
    {
      label: 'Total outlets',
      value: data?.totalOutlets ?? 0,
      sub: `${data?.recentOutletsCount ?? 0} new (30d)`,
      icon: Store,
      gradient: 'from-teal-600 to-cyan-600',
    },
    {
      label: 'On trial',
      value: summary.trial ?? 0,
      sub: `${summary.paid ?? 0} paid`,
      icon: Clock,
      gradient: 'from-sky-600 to-blue-600',
    },
    {
      label: 'Past due',
      value: summary.past_due ?? 0,
      sub: `${summary.unpaid ?? 0} unpaid`,
      icon: CreditCard,
      gradient: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Platform</p>
          <h1 className="text-3xl font-bold text-emerald-950 mt-1">Super Admin Dashboard</h1>
          <p className="text-emerald-700/80 mt-1">Owners, outlets, subscriptions & onboarding at a glance</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/super-admin/coupons"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
          >
            <Gift className="h-4 w-4" /> Coupons
          </Link>
          <Link
            to="/super-admin/subscriptions"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
          >
            <IndianRupee className="h-4 w-4" /> Subscriptions
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient} p-5 text-white shadow-lg`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/85">{c.label}</p>
                <p className="text-3xl font-bold mt-1">{c.value}</p>
                <p className="text-xs text-white/75 mt-1">{c.sub}</p>
              </div>
              <c.icon className="h-8 w-8 text-white/40" />
            </div>
          </div>
        ))}
      </div>

      {plan && (
        <div className="mb-8 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-emerald-900">Standard plan</h2>
          </div>
          <p className="text-emerald-800">
            <span className="font-bold text-2xl text-emerald-700">₹{plan.basePricePerMonth}</span>
            <span className="text-sm"> / outlet / month</span>
            <span className="mx-2 text-emerald-300">·</span>
            Up to <strong>{plan.includedStaff}</strong> staff included
            <span className="mx-2 text-emerald-300">·</span>
            <strong>₹{plan.extraStaffPrice}</strong> per extra staff
          </p>
          <p className="text-sm text-emerald-600 mt-2">
            Default {plan.defaultTrialDays}-day free trial on new outlets. Use coupons for extended trials.
          </p>
        </div>
      )}

      {canViewLeads && (
        <div className="mb-8 bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-50 flex items-center justify-between">
            <h2 className="font-bold text-emerald-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-600" />
              Demo requests
              {newLeadCount > 0 ? (
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                  {newLeadCount} new
                </span>
              ) : null}
            </h2>
            <Link
              to="/super-admin/demo-requests"
              className="text-sm font-semibold text-emerald-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/50 text-left text-emerald-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Phone</th>
                  <th className="px-3 py-3 font-semibold">Interest</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {recentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-emerald-600/70">
                      No demo requests from the landing page yet
                    </td>
                  </tr>
                ) : (
                  recentLeads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-emerald-50/30">
                      <td className="px-4 py-3 text-emerald-700 whitespace-nowrap">
                        {lead.createdAt ? format(new Date(lead.createdAt), 'dd MMM yyyy, HH:mm') : '—'}
                      </td>
                      <td className="px-3 py-3 font-semibold text-emerald-950">{lead.name}</td>
                      <td className="px-3 py-3 font-medium text-emerald-800">{lead.phone}</td>
                      <td className="px-3 py-3 text-emerald-800">{lead.interest}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-50 flex items-center justify-between">
            <h2 className="font-bold text-emerald-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Recent outlet onboarding
            </h2>
            <Link to="/super-admin/outlets" className="text-sm font-semibold text-emerald-600 hover:underline">
              All outlets
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/50 text-left text-emerald-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Outlet</th>
                  <th className="px-3 py-3 font-semibold">Owner</th>
                  <th className="px-3 py-3 font-semibold">Plan / cycle</th>
                  <th className="px-3 py-3 font-semibold">Coupon</th>
                  <th className="px-3 py-3 font-semibold">Payment</th>
                  <th className="px-3 py-3 font-semibold">Due / paid</th>
                  <th className="px-3 py-3 font-semibold">Sales rep</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {(data?.onboarding ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-emerald-600/70">
                      No new outlets in the last 30 days
                    </td>
                  </tr>
                ) : (
                  data?.onboarding.map((row) => (
                    <tr key={row.outletId} className="hover:bg-emerald-50/30 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-emerald-950">{row.outletName}</p>
                        <p className="text-xs text-emerald-600/70">
                          {row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy') : '—'}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-emerald-900">{row.ownerName}</p>
                        <p className="text-xs text-emerald-600/70">{row.ownerEmail}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{row.planName}</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          {billingCycleLabel(row.billingCycleMonths || 1)}
                        </p>
                        <div className="mt-1">
                          <StatusBadge value={row.status} />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {row.couponCode ? (
                          <>
                            <p className="font-mono text-violet-700">{row.couponCode}</p>
                            {row.couponType && (
                              <span className="text-violet-600">{row.couponType.replace('_', ' ')}</span>
                            )}
                            {row.discountAmountInr > 0 && (
                              <p className="text-violet-700">−₹{row.discountAmountInr}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-emerald-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge value={row.paymentStatus} />
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <p className="font-semibold text-emerald-800">Due ₹{row.amountDueInr ?? row.monthlyAmountInr}</p>
                        <p className="text-emerald-600">Paid ₹{row.totalPaidInr ?? 0}</p>
                        <p className="text-emerald-500">{row.staffCount} staff</p>
                      </td>
                      <td className="px-3 py-3 text-emerald-800 font-medium">{row.soldByName || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-50">
            <h2 className="font-bold text-emerald-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              New owners (30d)
            </h2>
          </div>
          <ul className="divide-y divide-emerald-50 max-h-96 overflow-y-auto">
            {(data?.recentOwners ?? []).length === 0 ? (
              <li className="px-6 py-10 text-center text-emerald-600/70 text-sm">No new owners</li>
            ) : (
              data?.recentOwners.map((o) => (
                <li key={o._id} className="px-6 py-4 hover:bg-emerald-50/30">
                  <p className="font-semibold text-emerald-950">{o.name}</p>
                  <p className="text-xs text-emerald-600">{o.email}</p>
                  <p className="text-xs text-emerald-500 mt-1">
                    {o.createdAt ? format(new Date(o.createdAt), 'dd MMM yyyy') : ''}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
