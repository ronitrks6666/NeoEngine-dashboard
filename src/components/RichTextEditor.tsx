import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
  Unlink,
  X,
} from 'lucide-react';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
};

const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5'] as const;
type HeadingLevel = (typeof HEADING_LEVELS)[number];
type BlockTag = HeadingLevel | 'p';

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function focusEditor(editorRef: React.RefObject<HTMLDivElement | null>) {
  editorRef.current?.focus();
}

function getActiveBlockTag(editor: HTMLElement | null): BlockTag {
  if (!editor) return 'p';
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 'p';

  let node: Node | null = sel.anchorNode;
  if (!node || !editor.contains(node)) return 'p';
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

  while (node && node !== editor) {
    const tag = (node as HTMLElement).tagName?.toLowerCase();
    if (tag && (HEADING_LEVELS as readonly string[]).includes(tag)) return tag as HeadingLevel;
    if (tag === 'p' || tag === 'div') return 'p';
    node = node.parentElement;
  }
  return 'p';
}

function findAnchorInSelection(editor: HTMLElement | null): HTMLAnchorElement | null {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  let node: Node | null = sel.anchorNode;
  if (!node || !editor.contains(node)) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

  while (node && node !== editor) {
    if ((node as HTMLElement).tagName === 'A') return node as HTMLAnchorElement;
    node = node.parentElement;
  }
  return null;
}

function normalizeLinkUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function createLinkElement(href: string, text: string) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.textContent = text;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  return anchor;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content…',
  className = '',
  minHeight = 420,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [activeBlock, setActiveBlock] = useState<BlockTag>('p');
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [editingLink, setEditingLink] = useState<HTMLAnchorElement | null>(null);

  const refreshActiveBlock = useCallback(() => {
    setActiveBlock(getActiveBlockTag(editorRef.current));
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.innerHTML === value) return;
    el.innerHTML = value || '';
  }, [value]);

  useEffect(() => {
    const onSelectionChange = () => {
      if (!editorRef.current) return;
      const sel = window.getSelection();
      if (!sel?.anchorNode || !editorRef.current.contains(sel.anchorNode)) return;
      refreshActiveBlock();
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [refreshActiveBlock]);

  useEffect(() => {
    if (!linkModalOpen) return;
    const timer = window.setTimeout(() => urlInputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLinkModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [linkModalOpen]);

  const sync = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    onChange(html === '<br>' ? '' : html);
    refreshActiveBlock();
  }, [onChange, refreshActiveBlock]);

  const run = useCallback(
    (command: string, commandValue?: string) => {
      focusEditor(editorRef);
      exec(command, commandValue);
      sync();
    },
    [sync]
  );

  const toggleHeading = useCallback(
    (level: HeadingLevel) => {
      focusEditor(editorRef);
      const current = getActiveBlockTag(editorRef.current);
      const next: BlockTag = current === level ? 'p' : level;
      exec('formatBlock', next);
      sync();
      setActiveBlock(next);
    },
    [sync]
  );

  const openLinkModal = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    focusEditor(editorRef);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRangeRef.current = null;
    }

    const existingLink = findAnchorInSelection(editor);
    if (existingLink) {
      setEditingLink(existingLink);
      setLinkUrl(existingLink.getAttribute('href') ?? '');
      setLinkText(existingLink.textContent ?? '');
    } else {
      setEditingLink(null);
      setLinkUrl('');
      setLinkText(sel?.toString() ?? '');
    }

    setLinkModalOpen(true);
  }, []);

  const closeLinkModal = useCallback(() => {
    setLinkModalOpen(false);
    setEditingLink(null);
    savedRangeRef.current = null;
  }, []);

  const applyLink = useCallback(() => {
    const editor = editorRef.current;
    const href = normalizeLinkUrl(linkUrl);
    const text = linkText.trim() || href;
    if (!editor || !href) return;

    if (editingLink && editor.contains(editingLink)) {
      editingLink.href = href;
      editingLink.textContent = text;
      editingLink.target = '_blank';
      editingLink.rel = 'noopener noreferrer';
      closeLinkModal();
      sync();
      return;
    }

    focusEditor(editorRef);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    if (savedRangeRef.current) {
      sel?.addRange(savedRangeRef.current);
    }

    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const anchor = createLinkElement(href, text);

    if (!range || !editor.contains(range.commonAncestorContainer)) {
      editor.appendChild(document.createTextNode(' '));
      editor.appendChild(anchor);
    } else if (range.collapsed) {
      range.insertNode(anchor);
      range.setStartAfter(anchor);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    } else {
      range.deleteContents();
      range.insertNode(anchor);
    }

    closeLinkModal();
    sync();
  }, [closeLinkModal, editingLink, linkText, linkUrl, sync]);

  const toolBtn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors';
  const headingBtn = (level: HeadingLevel) =>
    `inline-flex h-8 min-w-[2rem] px-1.5 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
      activeBlock === level
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const linkPreview = normalizeLinkUrl(linkUrl);

  return (
    <>
      <div className={`rounded-2xl border border-gray-200 bg-white overflow-hidden ${className}`}>
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50/80 px-3 py-2">
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => run('bold')} title="Bold">
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => run('italic')} title="Italic">
            <Italic className="h-4 w-4" />
          </button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => run('underline')} title="Underline">
            <Underline className="h-4 w-4" />
          </button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => run('strikeThrough')} title="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-gray-200" />
          {HEADING_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={headingBtn(level)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleHeading(level)}
              title={
                activeBlock === level
                  ? `${level.toUpperCase()} active — click again for normal text`
                  : `Apply ${level.toUpperCase()}`
              }
              aria-pressed={activeBlock === level}
            >
              {level.toUpperCase()}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-gray-200" />
          <button
            type="button"
            className={toolBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={openLinkModal}
            title="Insert or edit link"
          >
            <Link2 className="h-4 w-4" />
          </button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => run('unlink')} title="Remove link">
            <Unlink className="h-4 w-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-gray-200" />
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => run('insertUnorderedList')} title="Bullet list">
            <List className="h-4 w-4" />
          </button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => run('insertOrderedList')} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </button>
          <p className="ml-auto text-xs text-gray-400 hidden xl:block">
            Click the same heading again to reset to normal text
          </p>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          onKeyUp={refreshActiveBlock}
          onMouseUp={refreshActiveBlock}
          onClick={refreshActiveBlock}
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
          .rich-text-editor p { margin: 0 0 0.5rem; font-size: 0.875rem; line-height: 1.625; }
          .rich-text-editor h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0 0.5rem; line-height: 1.3; }
          .rich-text-editor h2 { font-size: 1.25rem; font-weight: 700; margin: 0.65rem 0 0.4rem; line-height: 1.35; }
          .rich-text-editor h3 { font-size: 1.125rem; font-weight: 700; margin: 0.55rem 0 0.35rem; line-height: 1.4; }
          .rich-text-editor h4 { font-size: 1rem; font-weight: 700; margin: 0.5rem 0 0.3rem; line-height: 1.45; }
          .rich-text-editor h5 { font-size: 0.875rem; font-weight: 700; margin: 0.45rem 0 0.25rem; line-height: 1.5; }
          .rich-text-editor b, .rich-text-editor strong { font-weight: 700; }
          .rich-text-editor i, .rich-text-editor em { font-style: italic; }
          .rich-text-editor u { text-decoration: underline; }
          .rich-text-editor s, .rich-text-editor strike, .rich-text-editor del { text-decoration: line-through; }
          .rich-text-editor a { color: #059669; text-decoration: underline; word-break: break-word; }
        `}</style>
      </div>

      {linkModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in"
          onMouseDown={closeLinkModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-black/5 animate-slide-up"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-50 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 px-6 py-5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="link-dialog-title" className="text-lg font-bold text-gray-900">
                    {editingLink ? 'Edit link' : 'Insert link'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Add a URL and choose the text shown in your rules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeLinkModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="px-6 py-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                applyLink();
              }}
            >
              <div className="space-y-1.5">
                <label htmlFor="rich-text-link-url" className="text-sm font-semibold text-gray-700">
                  Link URL
                </label>
                <input
                  ref={urlInputRef}
                  id="rich-text-link-url"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="rich-text-link-text" className="text-sm font-semibold text-gray-700">
                  Visible text
                </label>
                <input
                  id="rich-text-link-text"
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Text shown to staff"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-xs text-gray-400">
                  Leave empty to use the URL as the link text.
                </p>
              </div>

              {linkPreview ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 mb-1">Preview</p>
                  <p className="text-sm text-gray-800">
                    <span className="text-emerald-700 underline font-medium">{linkText.trim() || linkPreview}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{linkPreview}</p>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeLinkModal}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!linkUrl.trim()}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {editingLink ? 'Update link' : 'Insert link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
