import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type SubscriptionRow, type BillingCoupon } from '@/api/admin';
import { getApiErrorMessage } from '@/api/auth';
import { IndianRupee, Pencil, X, Filter } from 'lucide-react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { BILLING_CYCLE_OPTIONS, billingCycleLabel } from '@/lib/billing';

function Badge({ value }: { value: string }) {
  const map: Record<string, string> = {
    trial: 'bg-sky-100 text-sky-800',
    active: 'bg-emerald-100 text-emerald-800',
    past_due: 'bg-amber-100 text-amber-900',
    cancelled: 'bg-gray-100 text-gray-600',
    free: 'bg-violet-100 text-violet-800',
    paid: 'bg-emerald-100 text-emerald-800',
    unpaid: 'bg-red-100 text-red-800',
    free_trial: 'bg-sky-100 text-sky-800',
    percent_off: 'bg-violet-100 text-violet-800',
    fixed_off: 'bg-amber-100 text-amber-900',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[value] || 'bg-gray-100'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

const EMPTY_FILTERS = {
  search: '',
  status: '',
  paymentStatus: '',
  billingCycle: '',
  coupon: '',
  salesRep: '',
};

export function SubscriptionsPage() {
  const [editRow, setEditRow] = useState<SubscriptionRow | null>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [form, setForm] = useState({
    status: '',
    paymentStatus: '',
    couponId: '',
    billingCycleMonths: '1',
    soldById: '',
    totalPaidInr: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: adminApi.getSubscriptions,
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons'],
    queryFn: adminApi.getCoupons,
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ['sales-reps'],
    queryFn: adminApi.getSalesReps,
  });

  const activeCoupons = useMemo(
    () => coupons.filter((c: BillingCoupon) => c.isActive),
    [coupons]
  );

  const couponOptions = useMemo(
    () =>
      activeCoupons.map((c) => ({
        value: c._id,
        label: `${c.name} (${c.code})`,
        subtitle:
          c.description ||
          (c.type === 'free_trial'
            ? `${c.trialDays} day trial`
            : c.type === 'percent_off'
              ? `${c.percentOff}% off`
              : `₹${c.fixedAmountOffInr} off`),
      })),
    [activeCoupons]
  );

  const salesRepOptions = useMemo(
    () => salesReps.map((r) => ({ value: r.id, label: `${r.name} (${r.email})` })),
    [salesReps]
  );

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const s = row.subscription;
      const q = filters.search.trim().toLowerCase();
      if (q) {
        const hay = [
          row.outlet.name,
          row.outlet.owner?.name,
          row.outlet.owner?.email,
          s.couponCode,
          s.soldByName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status && s.status !== filters.status) return false;
      if (filters.paymentStatus && s.paymentStatus !== filters.paymentStatus) return false;
      if (filters.billingCycle && String(s.billingCycleMonths) !== filters.billingCycle) return false;
      if (filters.coupon === 'none' && s.couponCode) return false;
      if (filters.coupon === 'any' && !s.couponCode) return false;
      if (filters.coupon && !['none', 'any'].includes(filters.coupon) && s.couponCode !== filters.coupon)
        return false;
      if (filters.salesRep && s.soldById !== filters.salesRep && s.soldByName !== filters.salesRep)
        return false;
      return true;
    });
  }, [rows, filters]);

  const updateMutation = useMutation({
    mutationFn: ({
      outletId,
      payload,
    }: {
      outletId: string;
      payload: Parameters<typeof adminApi.updateSubscription>[1];
    }) => adminApi.updateSubscription(outletId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard-overview'] });
      setEditRow(null);
      setError('');
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const openEdit = (row: SubscriptionRow) => {
    setEditRow(row);
    setForm({
      status: row.subscription.status,
      paymentStatus: row.subscription.paymentStatus,
      couponId: row.subscription.couponId || '',
      billingCycleMonths: String(row.subscription.billingCycleMonths || 1),
      soldById: row.subscription.soldById || '',
      totalPaidInr: String(row.subscription.totalPaidInr ?? ''),
      notes: row.subscription.notes || '',
    });
    setError('');
  };

  const selectedCoupon = activeCoupons.find((c) => c._id === form.couponId);
  const previewMonthly = editRow?.subscription.listPriceInr ?? editRow?.subscription.monthlyAmountInr ?? 0;
  const previewCycle = parseInt(form.billingCycleMonths, 10) || 1;
  const previewPeriod = previewMonthly * previewCycle;
  let previewDiscount = 0;
  if (selectedCoupon?.type === 'percent_off') {
    previewDiscount = Math.round(previewPeriod * (selectedCoupon.percentOff / 100));
  } else if (selectedCoupon?.type === 'fixed_off') {
    previewDiscount = Math.min(previewPeriod, selectedCoupon.fixedAmountOffInr || 0);
  }
  const previewDue = Math.max(0, previewPeriod - previewDiscount);

  const totalMrr = filtered.reduce((sum, r) => sum + (r.subscription.monthlyAmountInr || 0), 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-950 flex items-center gap-2">
          <IndianRupee className="h-7 w-7 text-emerald-600" />
          Subscriptions
        </h1>
        <p className="text-emerald-700 mt-1">
          ₹999/outlet/month · 20 staff · ₹49/extra · Showing {filtered.length} of {rows.length} · MRR ₹
          {totalMrr}
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 mb-3">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <input
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm xl:col-span-2"
            placeholder="Search outlet, owner, coupon, rep…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {['trial', 'active', 'past_due', 'cancelled', 'free'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
          >
            <option value="">All payments</option>
            {['trial', 'paid', 'unpaid', 'free'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            value={filters.billingCycle}
            onChange={(e) => setFilters({ ...filters, billingCycle: e.target.value })}
          >
            <option value="">All cycles</option>
            {BILLING_CYCLE_OPTIONS.map((o) => (
              <option key={o.value} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            value={filters.coupon}
            onChange={(e) => setFilters({ ...filters, coupon: e.target.value })}
          >
            <option value="">Any coupon</option>
            <option value="any">Has coupon</option>
            <option value="none">No coupon</option>
            {coupons.map((c) => (
              <option key={c._id} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            value={filters.salesRep}
            onChange={(e) => setFilters({ ...filters, salesRep: e.target.value })}
          >
            <option value="">All sales reps</option>
            {salesReps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        {(filters.search ||
          filters.status ||
          filters.paymentStatus ||
          filters.billingCycle ||
          filters.coupon ||
          filters.salesRep) && (
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-emerald-600 hover:underline"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-emerald-50 text-emerald-800 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Outlet</th>
              <th className="px-3 py-3 font-semibold">Owner</th>
              <th className="px-3 py-3 font-semibold">Cycle</th>
              <th className="px-3 py-3 font-semibold">Plan / coupon</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Pricing</th>
              <th className="px-3 py-3 font-semibold">Paid</th>
              <th className="px-3 py-3 font-semibold">Sales rep</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-emerald-600">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-emerald-600/70">
                  No subscriptions match filters
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const s = row.subscription;
                return (
                  <tr key={row.outlet._id} className="hover:bg-emerald-50/30 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-emerald-950">{row.outlet.name}</p>
                      <p className="text-xs text-emerald-600">{s.staffCount} staff</p>
                    </td>
                    <td className="px-3 py-3 text-emerald-800">{row.outlet.owner?.name || '—'}</td>
                    <td className="px-3 py-3 font-medium">{billingCycleLabel(s.billingCycleMonths || 1)}</td>
                    <td className="px-3 py-3">
                      <p>{s.planName}</p>
                      {s.couponCode ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs font-mono text-violet-700">{s.couponCode}</p>
                          {s.couponType && <Badge value={s.couponType} />}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-500">No coupon</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge value={s.status} />
                      <div className="mt-1">
                        <Badge value={s.paymentStatus} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <p>
                        List: <strong>₹{s.periodListPriceInr || s.monthlyAmountInr}</strong>
                      </p>
                      {s.discountAmountInr > 0 && (
                        <p className="text-violet-700">−₹{s.discountAmountInr} discount</p>
                      )}
                      <p className="text-emerald-800 font-semibold">Due: ₹{s.amountDueInr}</p>
                    </td>
                    <td className="px-3 py-3 font-bold text-emerald-800">₹{s.totalPaidInr ?? 0}</td>
                    <td className="px-3 py-3 text-emerald-800">{s.soldByName || '—'}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="font-bold text-emerald-950">Edit — {editRow.outlet.name}</h2>
              <button type="button" onClick={() => setEditRow(null)} className="p-1 hover:bg-emerald-50 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  outletId: editRow.outlet._id,
                  payload: {
                    status: form.status,
                    paymentStatus: form.paymentStatus,
                    billingCycleMonths: parseInt(form.billingCycleMonths, 10) || 1,
                    couponId: form.couponId || undefined,
                    soldById: form.soldById || undefined,
                    totalPaidInr:
                      form.totalPaidInr === '' ? undefined : parseInt(form.totalPaidInr, 10) || 0,
                    notes: form.notes,
                  },
                });
              }}
            >
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <label className="block text-sm font-medium text-emerald-900">
                Billing cycle
                <select
                  className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2"
                  value={form.billingCycleMonths}
                  onChange={(e) => setForm({ ...form, billingCycleMonths: e.target.value })}
                >
                  {BILLING_CYCLE_OPTIONS.map((o) => (
                    <option key={o.value} value={String(o.value)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-emerald-900">
                Apply coupon
                <div className="mt-1">
                  <SearchableSelect
                    options={[{ value: '', label: 'No coupon' }, ...couponOptions]}
                    value={form.couponId}
                    onChange={(v) => setForm({ ...form, couponId: v })}
                    placeholder="Select coupon…"
                  />
                </div>
                {selectedCoupon && (
                  <p className="mt-1 text-xs text-emerald-600">
                    {selectedCoupon.description || selectedCoupon.name} · Code: {selectedCoupon.code}
                  </p>
                )}
              </label>

              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm space-y-1">
                <p className="font-semibold text-emerald-900">Pricing preview</p>
                <p>
                  List ({billingCycleLabel(previewCycle)}): ₹{previewPeriod}
                </p>
                {previewDiscount > 0 && <p className="text-violet-700">Discount: −₹{previewDiscount}</p>}
                <p className="font-bold text-emerald-800">Amount due: ₹{previewDue}</p>
              </div>

              <label className="block text-sm font-medium text-emerald-900">
                Sales representative
                <div className="mt-1">
                  <SearchableSelect
                    options={[{ value: '', label: 'Unassigned' }, ...salesRepOptions]}
                    value={form.soldById}
                    onChange={(v) => setForm({ ...form, soldById: v })}
                    placeholder="Who sold this plan?"
                  />
                </div>
              </label>

              <label className="block text-sm font-medium text-emerald-900">
                Total paid (₹)
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2"
                  value={form.totalPaidInr}
                  onChange={(e) => setForm({ ...form, totalPaidInr: e.target.value })}
                />
              </label>

              <label className="block text-sm font-medium text-emerald-900">
                Status
                <select
                  className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {['trial', 'active', 'past_due', 'cancelled', 'free'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-emerald-900">
                Payment status
                <select
                  className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2"
                  value={form.paymentStatus}
                  onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                >
                  {['trial', 'paid', 'unpaid', 'free'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Save changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
