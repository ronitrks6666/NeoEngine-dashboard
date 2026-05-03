interface LegalSectionProps {
  id?: string;
  title: string;
  children: React.ReactNode;
}

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900 border-b border-emerald-100 pb-2">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export function LegalUnorderedList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2 marker:text-primary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
