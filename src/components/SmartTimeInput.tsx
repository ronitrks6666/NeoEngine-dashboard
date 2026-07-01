import { useEffect, useState } from 'react';
import {
  formatTypedTimeDisplay,
  parseFlexibleTimeDigits,
  parseHHmm,
  formatTime12,
} from '@/utils/taskScheduleUtils';

type SmartTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

function displayFromValue(value?: string): string {
  const parsed = parseHHmm(value);
  if (parsed == null) return '';
  const h = Math.floor(parsed / 60);
  const m = parsed % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Type-friendly time field: typing 715 becomes 07:15 on blur.
 * Stores and emits 24h HH:mm.
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
  const [text, setText] = useState(() => displayFromValue(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(displayFromValue(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const next = parseFlexibleTimeDigits(raw);
    if (next) {
      onChange(next);
      setText(displayFromValue(next));
    }
  };

  const sanitizeTypedTime = (raw: string): string => {
    const cleaned = raw.replace(/[^\d:]/g, '');
    if (!cleaned) return '';

    // Allow direct "HH:MM" style editing without fighting cursor intent.
    if (cleaned.includes(':')) {
      const [leftRaw = '', rightRaw = ''] = cleaned.split(':');
      const left = leftRaw.replace(/[^\d]/g, '').slice(0, 2);
      const right = rightRaw.replace(/[^\d]/g, '').slice(0, 2);
      return rightRaw !== '' || cleaned.endsWith(':') ? `${left}:${right}` : left;
    }

    // Digit-only typing path (715 => 07:15).
    return formatTypedTimeDisplay(cleaned);
  };

  const handleChange = (raw: string) => {
    const nextText = sanitizeTypedTime(raw);
    if (!nextText) {
      setText('');
      return;
    }
    setText(nextText);

    const digitCount = nextText.replace(/[^\d]/g, '').length;
    if (digitCount >= 4 || /^\d{1,2}:\d{1,2}$/.test(nextText)) {
      const next = parseFlexibleTimeDigits(nextText);
      if (next) {
        onChange(next);
      }
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (!text.trim()) return;
    const next = parseFlexibleTimeDigits(text);
    if (next) {
      onChange(next);
      setText(displayFromValue(next));
      return;
    }
    setText(displayFromValue(value));
  };

  const friendly = value ? formatTime12(value) : null;

  return (
    <div className={className}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-3.5 text-center text-base font-semibold tabular-nums text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
      />
      <p className="mt-1.5 text-xs text-gray-500">
        {focused
          ? 'Type numbers only — e.g. 715 becomes 07:15'
          : friendly
            ? `${friendly} · type 715 for 07:15`
            : 'Type 715 for 07:15, or 1930 for 7:30 PM'}
      </p>
    </div>
  );
}
