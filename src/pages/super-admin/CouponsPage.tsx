import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { getApiErrorMessage } from '@/api/auth';
import { format } from 'date-fns';
import { Gift, Plus, X, Copy, Check, Filter } from 'lucide-react';
import { copyToClipboard } from '@/lib/billing';

const EMPTY_FILTERS = {
  search: '',
  type: '',
  status: '',
  validity: '',
};

export function CouponsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'free_trial' as 'free_trial' | 'percent_off' | 'fixed_off',
    trialDays: '30',
    percentOff: '',
    fixedAmountOffInr: '',
    maxRedemptions: '0',
    validUntil: '',
  });

  const queryClient = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: adminApi.getCoupons,
  });

  const filtered = useMemo(() => {
    const now = new Date();
    return coupons.filter((c) => {
      const q = filters.search.trim().toLowerCase();
      if (q) {
        const hay = [c.code, c.name, c.description].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.type && c.type !== filters.type) return false;
      if (filters.status === 'active' && !c.isActive) return false;
      if (filters.status === 'inactive' && c.isActive) return false;
      if (filters.validity === 'expired' && c.validUntil && new Date(c.validUntil) >= now) return false;
      if (filters.validity === 'valid' && c.validUntil && new Date(c.validUntil) < now) return false;
      return true;
    });
  }, [coupons, filters]);

  const createMutation = useMutation({
    mutationFn: adminApi.createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setShowCreate(false);
      setForm({
        code: '',
        name: '',
        description: '',
        type: 'free_trial',
        trialDays: '30',
        percentOff: '',
        fixedAmountOffInr: '',
        maxRedemptions: '0',
        validUntil: '',
      });
      setError('');
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateCoupon(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const handleCopy = async (id: string, code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950 flex items-center gap-2">
            <Gift className="h-7 w-7 text-emerald-600" />
            Coupons & trials
          </h1>
          <p className="text-emerald-700 mt-1">
            {filtered.length} of {coupons.length} coupons
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> New coupon
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 mb-3">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            placeholder="Search code, name…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All types</option>
            <option value="free_trial">Free trial</option>
            <option value="percent_off">Percent off</option>
            <option value="fixed_off">Fixed ₹ off</option>
          </select>
          <select
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm"
            value={filters.validity}
            onChange={(e) => setFilters({ ...filters, validity: e.target.value })}
          >
            <option value="">Any validity</option>
            <option value="valid">Not expired</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <p className="text-emerald-600 col-span-2">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-emerald-600/70 col-span-2 py-12 text-center bg-white rounded-2xl border border-emerald-100">
            No coupons match filters
          </p>
        ) : (
          filtered.map((c) => (
            <div
              key={c._id}
              className={`rounded-2xl border p-5 shadow-sm transition ${
                c.isActive ? 'bg-white border-emerald-100' : 'bg-gray-50 border-gray-200 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <button
                    type="button"
                    title="Copy code"
                    onClick={() => handleCopy(c._id, c.code)}
                    className="shrink-0 mt-0.5 p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  >
                    {copiedId === c._id ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="font-mono text-lg font-bold text-emerald-800 tracking-wide truncate">
                      {c.code}
                    </p>
                    <p className="font-semibold text-emerald-950 mt-1">{c.name}</p>
                    {c.description && <p className="text-sm text-emerald-600 mt-1">{c.description}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate({ id: c._id, isActive: !c.isActive })}
                  className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1 ${
                    c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {c.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-sky-100 text-sky-800 px-2 py-1 font-medium">
                  {c.type === 'free_trial'
                    ? `${c.trialDays} day trial`
                    : c.type === 'percent_off'
                      ? `${c.percentOff}% off`
                      : `₹${c.fixedAmountOffInr} off`}
                </span>
                <span className="rounded-lg bg-emerald-50 text-emerald-700 px-2 py-1">
                  Used {c.redemptionCount}
                  {c.maxRedemptions > 0 ? ` / ${c.maxRedemptions}` : ''}
                </span>
                {c.validUntil && (
                  <span className="rounded-lg bg-amber-50 text-amber-800 px-2 py-1">
                    Expires {format(new Date(c.validUntil), 'dd MMM yyyy')}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="font-bold text-emerald-950">Create coupon</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 hover:bg-emerald-50 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  code: form.code,
                  name: form.name,
                  description: form.description,
                  type: form.type,
                  trialDays: form.trialDays === '' ? 30 : parseInt(form.trialDays, 10),
                  percentOff: form.percentOff === '' ? 0 : parseInt(form.percentOff, 10),
                  fixedAmountOffInr:
                    form.fixedAmountOffInr === '' ? 0 : parseInt(form.fixedAmountOffInr, 10),
                  maxRedemptions: form.maxRedemptions === '' ? 0 : parseInt(form.maxRedemptions, 10),
                  validUntil: form.validUntil || undefined,
                });
              }}
            >
              {error && <p className="text-sm text-red-600">{error}</p>}
              <input
                className="w-full rounded-xl border border-emerald-200 px-4 py-2.5 font-mono uppercase"
                placeholder="CODE e.g. TRIAL30"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                required
              />
              <input
                className="w-full rounded-xl border border-emerald-200 px-4 py-2.5"
                placeholder="Display name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <textarea
                className="w-full rounded-xl border border-emerald-200 px-4 py-2.5"
                placeholder="Description (shown in subscription dropdown)"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <label className="block text-sm font-medium text-emerald-900">
                Type
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
                >
                  <option value="free_trial">Free trial (days)</option>
                  <option value="percent_off">Percent off</option>
                  <option value="fixed_off">Fixed ₹ off</option>
                </select>
              </label>
              {form.type === 'free_trial' && (
                <label className="block text-sm font-medium text-emerald-900">
                  Trial days
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={form.trialDays}
                    onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
                  />
                </label>
              )}
              {form.type === 'percent_off' && (
                <label className="block text-sm font-medium text-emerald-900">
                  Percent off
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={form.percentOff}
                    onChange={(e) => setForm({ ...form, percentOff: e.target.value })}
                  />
                </label>
              )}
              {form.type === 'fixed_off' && (
                <label className="block text-sm font-medium text-emerald-900">
                  Fixed amount off (₹)
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={form.fixedAmountOffInr}
                    onChange={(e) => setForm({ ...form, fixedAmountOffInr: e.target.value })}
                  />
                </label>
              )}
              <label className="block text-sm font-medium text-emerald-900">
                Max redemptions (0 = unlimited)
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={form.maxRedemptions}
                  onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium text-emerald-900">
                Valid until (optional)
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </label>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Create coupon
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
