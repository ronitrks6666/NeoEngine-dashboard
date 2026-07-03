import { Mic, Paperclip, SendHorizontal, Sparkles } from 'lucide-react';

type Props = {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionToggle?: () => void;
};

const PLACEHOLDERS = [
  'Ask anything about attendance, payroll, tasks, issues, leave, staff or operations...',
  'Who came late today?',
  'Show top performers...',
  'Which outlet needs attention?',
];

export function ChatInput({ value, busy, onChange, onSubmit, onSuggestionToggle }: Props) {
  const placeholder = PLACEHOLDERS[Math.floor(Date.now() / 15000) % PLACEHOLDERS.length];

  return (
    <div className="border-t border-emerald-100 bg-white/95 backdrop-blur-sm px-4 py-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white shadow-sm px-3 py-2 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
          <button type="button" className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Attachment (coming soon)">
            <Paperclip className="h-4 w-4" />
          </button>
          <button type="button" className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Voice input (coming soon)">
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onSuggestionToggle}
            className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Smart suggestions"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            rows={1}
            placeholder={placeholder}
            disabled={busy}
            className="flex-1 resize-none bg-transparent px-1 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none min-h-[40px] max-h-32"
          />
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white p-2.5 hover:bg-emerald-500 disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 shadow-emerald"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
