import { Bot } from 'lucide-react';
import { EMPTY_STATE_EXAMPLES } from './suggestions';
import { greetingForTime } from './utils';

type Props = {
  userName?: string;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function EmptyState({ userName, onSelect, disabled }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="max-w-xl w-full text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <Bot className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {greetingForTime()} 👋{userName ? `, ${userName.split(' ')[0]}` : ''}
        </h2>
        <p className="text-gray-500 mt-2">Here&apos;s what you can ask</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          {EMPTY_STATE_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(example)}
              className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/50 hover:-translate-y-0.5 transition-all duration-200 text-left disabled:opacity-50 shadow-sm"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
