import { User } from 'lucide-react';
import type { StaffListCardData } from '../types';
import { ResponseCardShell } from '../shared/ResponseCardShell';

type Props = {
  data: StaffListCardData;
  updatedAt?: string;
};

export function StaffListCard({ data, updatedAt }: Props) {
  const label =
    data.listType === 'absent' ? 'Absent' : data.listType === 'late' ? 'Late' : 'Present';

  return (
    <ResponseCardShell title={`${label} Staff`} context={data.context} updatedAt={updatedAt}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{data.total}</span> staff {label.toLowerCase()}
        </p>
      </div>
      {data.staff.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center rounded-xl bg-gray-50">
          {data.listType === 'late'
            ? 'No late arrivals — no staff have checked in yet for this period.'
            : 'No staff in this category.'}
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {data.staff.map((person) => (
            <div
              key={`${person.name}-${person.role || ''}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-emerald-50/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{person.name}</p>
                {person.role && <p className="text-xs text-gray-500 truncate">{person.role}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data.total > data.staff.length && (
        <p className="text-xs text-gray-400 mt-3">+{data.total - data.staff.length} more not shown</p>
      )}
    </ResponseCardShell>
  );
}
