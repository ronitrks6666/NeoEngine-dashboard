import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { formatTime12, parseHHmm } from '@/utils/taskScheduleUtils';

type SmartTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

function splitValue(value?: string): { hh: string; mm: string } {
  const parsed = parseHHmm(value);
  if (parsed == null) return { hh: '', mm: '' };
  const h = Math.floor(parsed / 60);
  const m = parsed % 60;
  return { hh: String(h).padStart(2, '0'), mm: String(m).padStart(2, '0') };
}

/** Enforce 24-hour input: 3–9 alone → 03–09; cap at 23. */
function sanitizeHourDigits(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 2);
  if (!d) return '';

  const n0 = parseInt(d[0], 10);
  if (d.length === 1) {
    if (n0 > 2) return `0${n0}`;
    return d;
  }

  const n1 = parseInt(d[1], 10);
  if (n0 > 2) return `0${n0}`;
  if (n0 === 2 && n1 > 3) return '23';
  return d;
}

/** Enforce 60-minute input: 6–9 alone → 06–09; cap at 59. */
function sanitizeMinuteDigits(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 2);
  if (!d) return '';

  const n0 = parseInt(d[0], 10);
  if (d.length === 1) {
    if (n0 >= 6) return `0${n0}`;
    return d;
  }

  const n1 = parseInt(d[1], 10);
  if (n0 >= 6) return `0${n0}`;
  if (n0 === 5 && n1 > 9) return '59';
  return d;
}

/** Only push a full HH:mm to the parent when both sides have digits (or both empty). */
function emitFromParts(hh: string, mm: string, onChange: (v: string) => void) {
  const hRaw = sanitizeHourDigits(hh);
  const mRaw = sanitizeMinuteDigits(mm);
  if (!hRaw && !mRaw) {
    onChange('');
    return;
  }
  if (!hRaw || !mRaw) return;

  const h = parseInt(hRaw, 10);
  const m = parseInt(mRaw, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return;
  onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

function focusAtEnd(el: HTMLInputElement | null) {
  if (!el) return;
  const len = el.value.length;
  el.setSelectionRange(len, len);
}

/**
 * Two-segment HH : MM input — fully clearable, colon always visible in the center.
 * Backspace flows from minutes into hours when minutes are empty.
 */
export function SmartTimeInput({
  value,
  onChange,
  placeholder = '07:15',
  id,
  disabled,
  className = '',
  ariaLabel = 'Time',
}: SmartTimeInputProps) {
  const [hh, setHh] = useState('');
  const [mm, setMm] = useState('');
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hhRef = useRef<HTMLInputElement>(null);
  const mmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) {
      const parts = splitValue(value);
      setHh(parts.hh);
      setMm(parts.mm);
    }
  }, [value, focused]);

  const applyParts = (nextHh: string, nextMm: string) => {
    setHh(nextHh);
    setMm(nextMm);
    emitFromParts(nextHh, nextMm, onChange);
  };

  const commitOnBlur = () => {
    setFocused(false);
    if (!hh && !mm) {
      onChange('');
      return;
    }
    const hDigits = hh ? sanitizeHourDigits(hh) : '';
    const mDigits = mm ? sanitizeMinuteDigits(mm) : '';
    const h = hDigits ? parseInt(hDigits, 10) : 0;
    const m = mDigits ? parseInt(mDigits, 10) : 0;
    if (Number.isNaN(h) || Number.isNaN(m)) return;

    const next = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange(next);
    setHh(String(h).padStart(2, '0'));
    setMm(String(m).padStart(2, '0'));
  };

  const handleRootBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && rootRef.current?.contains(next)) return;
    commitOnBlur();
  };

  const handleHhChange = (raw: string) => {
    const digits = sanitizeHourDigits(raw);
    applyParts(digits, mm);
    if (digits.length === 2) {
      requestAnimationFrame(() => mmRef.current?.focus());
    }
  };

  const handleMmChange = (raw: string) => {
    const digits = sanitizeMinuteDigits(raw);
    applyParts(hh, digits);
  };

  const handleHhKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowRight' && (e.currentTarget.selectionStart ?? 0) >= hh.length) {
      e.preventDefault();
      mmRef.current?.focus();
      requestAnimationFrame(() => focusAtEnd(mmRef.current));
    }
  };

  const handleMmKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const selStart = e.currentTarget.selectionStart ?? 0;
    const selEnd = e.currentTarget.selectionEnd ?? 0;
    const hasSelection = selEnd > selStart;

    if (e.key === 'ArrowLeft' && selStart === 0 && !hasSelection) {
      e.preventDefault();
      hhRef.current?.focus();
      requestAnimationFrame(() => focusAtEnd(hhRef.current));
      return;
    }

    if (e.key !== 'Backspace') return;

    if (hasSelection) return;

    if (mm.length > 0 && selStart > 0) return;

    e.preventDefault();

    if (mm.length > 0 && selStart === 0) {
      applyParts(hh, '');
      return;
    }

    const nextHh = hh.slice(0, -1);
    applyParts(nextHh, '');
    hhRef.current?.focus();
    requestAnimationFrame(() => focusAtEnd(hhRef.current));
  };

  const friendly = value ? formatTime12(value) : null;
  const [phH, phM] = placeholder.includes(':') ? placeholder.split(':') : ['--', '--'];

  return (
    <div className={className}>
      <div
        ref={rootRef}
        onBlur={handleRootBlur}
        className={`flex min-h-[44px] items-center justify-center gap-1 rounded-xl border bg-white px-3 shadow-sm transition-colors ${
          focused ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <input
          ref={hhRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={hh}
          onFocus={() => setFocused(true)}
          onChange={(e) => handleHhChange(e.target.value)}
          onKeyDown={handleHhKeyDown}
          placeholder={phH}
          aria-label={`${ariaLabel} hours`}
          maxLength={2}
          className="w-10 border-0 bg-transparent p-0 text-center text-base font-semibold tabular-nums text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0"
        />
        <span className="select-none text-lg font-bold text-gray-400" aria-hidden>
          :
        </span>
        <input
          ref={mmRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={mm}
          onFocus={() => setFocused(true)}
          onChange={(e) => handleMmChange(e.target.value)}
          onKeyDown={handleMmKeyDown}
          placeholder={phM}
          aria-label={`${ariaLabel} minutes`}
          maxLength={2}
          className="w-10 border-0 bg-transparent p-0 text-center text-base font-semibold tabular-nums text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0"
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        {focused
          ? 'Type hours then minutes — Backspace moves across the colon'
          : friendly
            ? `${friendly}`
            : 'Set start/end time (24-hour)'}
      </p>
    </div>
  );
}
