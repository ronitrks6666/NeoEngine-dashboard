export function LiveStatus() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-[18px] py-3 text-[13px] font-medium text-slate-700"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0F8F68]" />
      </span>
      Live Platform Status
    </div>
  );
}
