export type TextSelection = { start: number; end: number };

const HTML_TAG_RE = /<\/?[a-z][\s\S]*?>/i;

export function containsHtml(text: string): boolean {
  return HTML_TAG_RE.test(text);
}

export function wrapSelection(
  text: string,
  selection: TextSelection,
  openTag: string,
  closeTag: string
): { text: string; selection: TextSelection } {
  const start = Math.max(0, Math.min(selection.start, text.length));
  const end = Math.max(start, Math.min(selection.end, text.length));
  const selected = text.slice(start, end);
  const wrapped = selected.length > 0 ? `${openTag}${selected}${closeTag}` : `${openTag}${closeTag}`;
  const nextText = text.slice(0, start) + wrapped + text.slice(end);
  const cursor = start + wrapped.length;
  return { text: nextText, selection: { start: cursor, end: cursor } };
}

export function prefixLines(
  text: string,
  selection: TextSelection,
  prefix: string
): { text: string; selection: TextSelection } {
  const start = Math.max(0, Math.min(selection.start, text.length));
  const end = Math.max(start, Math.min(selection.end, text.length));
  const block = text.slice(start, end);
  const lines = block.length > 0 ? block.split('\n') : [''];
  const prefixed = lines.map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`)).join('\n');
  const nextText = text.slice(0, start) + prefixed + text.slice(end);
  const cursor = start + prefixed.length;
  return { text: nextText, selection: { start: cursor, end: cursor } };
}

export function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isRichTextEmpty(text: string): boolean {
  return !stripHtml(text);
}
