import { useCallback, useRef, useState } from 'react';
import { Bold, Italic, List, Underline } from 'lucide-react';
import {
  prefixLines,
  type TextSelection,
  wrapSelection,
} from '@/lib/richText';

type FormatAction = 'bold' | 'italic' | 'underline' | 'bullet';

type Props = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
};

function getSelection(el: HTMLTextAreaElement): TextSelection {
  return { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
}

export function NeoNotesRichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 4,
  className = '',
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });

  const syncSelection = useCallback(() => {
    if (inputRef.current) {
      setSelection(getSelection(inputRef.current));
    }
  }, []);

  const applyFormat = useCallback(
    (action: FormatAction) => {
      let result: { text: string; selection: TextSelection };
      switch (action) {
        case 'bold':
          result = wrapSelection(value, selection, '<b>', '</b>');
          break;
        case 'italic':
          result = wrapSelection(value, selection, '<i>', '</i>');
          break;
        case 'underline':
          result = wrapSelection(value, selection, '<u>', '</u>');
          break;
        case 'bullet':
          result = prefixLines(value, selection, '• ');
          break;
        default:
          return;
      }
      onChange(result.text);
      setSelection(result.selection);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(result.selection.start, result.selection.end);
      });
    },
    [onChange, selection, value]
  );

  return (
    <div className={`rounded-xl border border-gray-200 overflow-hidden bg-white ${className}`}>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-1.5 rounded-md hover:bg-white text-gray-700"
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="p-1.5 rounded-md hover:bg-white text-gray-700"
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('underline')}
          className="p-1.5 rounded-md hover:bg-white text-gray-700"
          title="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('bullet')}
          className="p-1.5 rounded-md hover:bg-white text-gray-700"
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={syncSelection}
        onKeyUp={syncSelection}
        onMouseUp={syncSelection}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-sm focus:outline-none resize-y min-h-[5rem]"
      />
    </div>
  );
}
