import { useMemo } from 'react';
import { SearchableSelect } from '@/components/SearchableSelect';

const HOUR_24_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0');
  return { value: v, label: v };
});

const HOUR_12_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const v = String(n).padStart(2, '0');
  return { value: v, label: String(n) };
});

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => {
  const v = String(i).padStart(2, '0');
  return { value: v, label: v };
});

const AMPM_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

function parseHHmm(value: string | undefined): { h: string; m: string } {
  const v = value?.trim() ?? '';
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return { h: '', m: '' };
  const hh = m[1].padStart(2, '0');
  const mm = m[2];
  if (Number(hh) > 23 || Number(mm) > 59) return { h: '', m: '' };
  return { h: hh, m: mm };
}

function h24To12Parts(h: string, m: string): { h12: string; mm: string; ap: 'AM' | 'PM' } {
  if (!h) return { h12: '', mm: m || '', ap: 'AM' };
  const nh = parseInt(h, 10);
  if (nh === 0) return { h12: '12', mm: m, ap: 'AM' };
  if (nh < 12) return { h12: String(nh).padStart(2, '0'), mm: m, ap: 'AM' };
  if (nh === 12) return { h12: '12', mm: m, ap: 'PM' };
  return { h12: String(nh - 12).padStart(2, '0'), mm: m, ap: 'PM' };
}

function toH24mm(h12: string, mm: string, ap: 'AM' | 'PM'): string {
  let nh = parseInt(h12, 10);
  if (Number.isNaN(nh)) return '';
  if (ap === 'AM') {
    if (nh === 12) nh = 0;
  } else if (nh !== 12) {
    nh += 12;
  }
  return `${String(nh).padStart(2, '0')}:${mm || '00'}`;
}

export type TimePickerFieldProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** 12-hour UI with AM/PM; stored value remains 24h HH:mm for the API. */
  use12Hour?: boolean;
};

/**
 * Time picker: 24h or 12h + AM/PM themed dropdowns (stored as HH:mm 24-hour).
 */
export function TimePickerField({
  value,
  onChange,
  disabled,
  className = '',
  id,
  use12Hour = false,
}: TimePickerFieldProps) {
  const { h, m } = useMemo(() => parseHHmm(value), [value]);

  if (!use12Hour) {
    const setHour = (nextH: string) => {
      if (!nextH) {
        onChange('');
        return;
      }
      onChange(`${nextH}:${m || '00'}`);
    };

    const setMinute = (nextM: string) => {
      if (!nextM) {
        onChange(h ? `${h}:00` : '');
        return;
      }
      const hh = h || '00';
      onChange(`${hh}:${nextM}`);
    };

    return (
      <div id={id} className={`flex flex-wrap items-end gap-2 ${className}`}>
        <div className="min-w-[6rem] flex-1">
          <SearchableSelect
            value={h}
            onChange={setHour}
            options={HOUR_24_OPTIONS}
            placeholder="Hour"
            searchPlaceholder="Hour…"
            emptyText="No match"
            noOptionsText="No hours"
            disabled={disabled}
            showSearch={false}
            allowClear
          />
        </div>
        <span className="select-none pb-3 text-sm font-medium text-gray-400" aria-hidden>
          :
        </span>
        <div className="min-w-[6rem] flex-1">
          <SearchableSelect
            value={m}
            onChange={setMinute}
            options={MINUTE_OPTIONS}
            placeholder="Min"
            searchPlaceholder="Minute…"
            emptyText="No match"
            noOptionsText="No minutes"
            disabled={disabled || !h}
            showSearch={false}
            allowClear
          />
        </div>
      </div>
    );
  }

  const { h12, mm, ap } = useMemo(() => h24To12Parts(h, m), [h, m]);

  const setH12 = (next: string) => {
    if (!next) {
      onChange('');
      return;
    }
    onChange(toH24mm(next, mm || '00', ap));
  };

  const setMm = (next: string) => {
    if (!next) {
      onChange(h12 ? toH24mm(h12, '00', ap) : '');
      return;
    }
    onChange(toH24mm(h12 || '12', next, ap));
  };

  const setAp = (next: string) => {
    if (!next || !h12) return;
    onChange(toH24mm(h12, mm || '00', next as 'AM' | 'PM'));
  };

  return (
    <div id={id} className={`flex flex-wrap items-end gap-2 ${className}`}>
      <div className="min-w-[4.5rem] flex-1">
        <SearchableSelect
          value={h12}
          onChange={setH12}
          options={HOUR_12_OPTIONS}
          placeholder="Hour"
          searchPlaceholder="Hour…"
          emptyText="No match"
          noOptionsText="No hours"
          disabled={disabled}
          showSearch={false}
          allowClear
        />
      </div>
      <span className="select-none pb-3 text-sm font-medium text-gray-400" aria-hidden>
        :
      </span>
      <div className="min-w-[5rem] flex-1">
        <SearchableSelect
          value={mm}
          onChange={setMm}
          options={MINUTE_OPTIONS}
          placeholder="Min"
          searchPlaceholder="Minute…"
          emptyText="No match"
          noOptionsText="No minutes"
          disabled={disabled || !h12}
          showSearch={false}
          allowClear
        />
      </div>
      <div className="min-w-[5.5rem] flex-1">
        <SearchableSelect
          value={h12 ? ap : ''}
          onChange={(v) => setAp(v)}
          options={AMPM_OPTIONS}
          placeholder="AM / PM"
          searchPlaceholder="…"
          emptyText="—"
          noOptionsText="—"
          disabled={disabled || !h12}
          showSearch={false}
        />
      </div>
    </div>
  );
}
