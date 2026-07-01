/** Reserves hero visual column space while decorative mockups lazy-load. */
export function HeroVisualsSkeleton() {
  return (
    <div
      className="relative ml-auto w-full pb-0 min-[1200px]:translate-x-16"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-8 min-[992px]:flex-row min-[992px]:items-end min-[992px]:justify-end min-[992px]:gap-6 min-[1200px]:gap-8">
        <div className="h-[420px] w-[80%] max-w-[260px] rounded-[30px] bg-slate-100/60 animate-pulse min-[992px]:h-[520px] min-[992px]:w-[260px]" />
        <div className="h-[500px] w-full max-w-[900px] rounded-3xl bg-slate-100/60 animate-pulse min-[992px]:h-[560px] min-[1200px]:h-[600px]" />
      </div>
    </div>
  );
}

