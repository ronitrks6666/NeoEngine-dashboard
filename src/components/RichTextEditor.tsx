import { useCallback, useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Underline } from 'lucide-react';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
};

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content…',
  className = '',
  minHeight = 420,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.innerHTML === value) return;
    el.innerHTML = value || '';
  }, [value]);

  const sync = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    onChange(html === '<br>' ? '' : html);
  }, [onChange]);

  const toolBtn =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors';

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50/80 px-3 py-2">
        <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => { exec('bold'); sync(); }} title="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => { exec('italic'); sync(); }} title="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => { exec('underline'); sync(); }} title="Underline">
          <Underline className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => { exec('insertUnorderedList'); sync(); }} title="Bullet list">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => { exec('insertOrderedList'); sync(); }} title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </button>
        <p className="ml-auto text-xs text-gray-400 hidden sm:block">Bold, lists, and underline appear in the mobile app</p>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        data-placeholder={placeholder}
        className="rich-text-editor w-full px-5 py-4 text-sm leading-relaxed text-gray-800 focus:outline-none overflow-y-auto"
        style={{ minHeight }}
      />
      <style>{`
        .rich-text-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-text-editor ul { list-style: disc; padding-left: 1.25rem; margin: 0.5rem 0; }
        .rich-text-editor ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5rem 0; }
        .rich-text-editor p { margin: 0 0 0.5rem; }
        .rich-text-editor b, .rich-text-editor strong { font-weight: 700; }
        .rich-text-editor i, .rich-text-editor em { font-style: italic; }
        .rich-text-editor u { text-decoration: underline; }
      `}</style>
    </div>
  );
}
