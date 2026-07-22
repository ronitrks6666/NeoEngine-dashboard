import { containsHtml } from '@/lib/richText';

type Props = {
  html: string;
  className?: string;
};

export function NeoNotesRichTextView({ html, className = '' }: Props) {
  if (!html.trim()) return null;

  if (!containsHtml(html)) {
    return (
      <p className={`text-sm text-gray-800 whitespace-pre-wrap leading-relaxed ${className}`}>
        {html}
      </p>
    );
  }

  return (
    <div
      className={`neo-notes-rich-text text-sm text-gray-800 leading-relaxed [&_b]:font-bold [&_i]:italic [&_u]:underline ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
