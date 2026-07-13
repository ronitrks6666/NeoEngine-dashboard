import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Phone, Search } from 'lucide-react';
import { adminApi, type SalesLead, type SalesLeadStatus } from '@/api/admin';

const STATUS_OPTIONS: SalesLeadStatus[] = ['New', 'Contacted', 'Qualified', 'Closed'];

function StatusBadge({ status }: { status: SalesLeadStatus }) {
  const styles: Record<SalesLeadStatus, string> = {
    New: 'bg-sky-100 text-sky-800 ring-sky-200',
    Contacted: 'bg-amber-100 text-amber-900 ring-amber-200',
    Qualified: 'bg-violet-100 text-violet-800 ring-violet-200',
    Closed: 'bg-gray-100 text-gray-700 ring-gray-200',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${styles[status]}`}>
      {status}
    </span>
  );
}

export function SalesLeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SalesLeadStatus | 'all'>('all');

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['admin-sales-leads'],
    queryFn: adminApi.getSalesLeads,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SalesLeadStatus }) =>
      adminApi.updateSalesLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sales-leads'] });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        lead.interest.toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter]);

  const newCount = leads.filter((l) => l.status === 'New').length;

  if (isLoading) {
    return <div className="p-6 animate-pulse text-emerald-700">Loading demo requests…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Failed to load demo requests.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Landing page</p>
          <h1 className="text-3xl font-bold text-emerald-950 mt-1">Demo requests</h1>
          <p className="text-emerald-700/80 mt-1">
            Callbacks from the book demo / get a callback form
            {newCount > 0 ? (
              <span className="ml-2 inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                {newCount} new
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, interest…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SalesLeadStatus | 'all')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/50 text-left text-emerald-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-3 py-3 font-semibold">Name</th>
                <th className="px-3 py-3 font-semibold">Phone</th>
                <th className="px-3 py-3 font-semibold">Interest</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-emerald-600/70">
                    {leads.length === 0 ? 'No demo requests yet.' : 'No matches for your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <LeadRow
                    key={lead._id}
                    lead={lead}
                    onStatusChange={(status) => statusMutation.mutate({ id: lead._id, status })}
                    isUpdating={statusMutation.isPending && statusMutation.variables?.id === lead._id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  onStatusChange,
  isUpdating,
}: {
  lead: SalesLead;
  onStatusChange: (status: SalesLeadStatus) => void;
  isUpdating: boolean;
}) {
  return (
    <tr className="hover:bg-emerald-50/30 align-top">
      <td className="px-4 py-3 text-emerald-700 whitespace-nowrap">
        {lead.createdAt ? format(new Date(lead.createdAt), 'dd MMM yyyy, HH:mm') : '—'}
      </td>
      <td className="px-3 py-3 font-semibold text-emerald-950">{lead.name || '—'}</td>
      <td className="px-3 py-3">
        <a
          href={`tel:${lead.phone}`}
          className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
        >
          <Phone className="h-3.5 w-3.5" />
          {lead.phone}
        </a>
      </td>
      <td className="px-3 py-3 text-emerald-800">{lead.interest}</td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-2">
          <StatusBadge status={lead.status} />
          <select
            value={lead.status}
            onChange={(e) => onStatusChange(e.target.value as SalesLeadStatus)}
            disabled={isUpdating}
            className="max-w-[9rem] rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
            aria-label={`Update status for ${lead.name}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-emerald-600">{lead.source || 'landing-page'}</td>
    </tr>
  );
}
