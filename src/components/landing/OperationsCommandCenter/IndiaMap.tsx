import { memo, useCallback, useMemo, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { CityMarker } from './CityMarker';
import { ConnectionLine } from './ConnectionLine';
import { MapTooltip } from './MapTooltip';
import { OUTLETS, type Outlet } from './operations.data';

// india-outline.svg viewBox is exactly 0 0 612 696.
// All city x,y in operations.data.ts use that same coordinate space.
// Placing cards inside the SVG via foreignObject guarantees they track
// markers at every screen size — no CSS-% drift from SVG scaling.
const VB_W = 612;
const VB_H = 696;

// KPI cards shown for the four secondary cities.
// dx/dy = offset from the city marker so the card never overlaps the dot.
const KPI_CARDS = [
  { id: 'del', city: 'Delhi',     health: 95, dx: -92, dy: -60 },
  { id: 'mum', city: 'Mumbai',    health: 88, dx:  14, dy: -50 },
  { id: 'hyd', city: 'Hyderabad', health: 90, dx:  16, dy: -54 },
  { id: 'chn', city: 'Chennai',   health: 91, dx:  16, dy: -54 },
] as const;

// ─── inner card components ────────────────────────────────────────────────────

function KpiCard({
  outlet, city, health, dx, dy, reducedMotion,
}: {
  outlet: Outlet;
  city: string;
  health: number;
  dx: number;
  dy: number;
  reducedMotion: boolean | null;
}) {
  const x = outlet.x + dx;
  const y = outlet.y + dy;
  return (
    <foreignObject x={x} y={y} width={90} height={54} overflow="visible" pointerEvents="none">
      <motion.div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #EEF2F7',
          boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
          padding: '9px 12px',
          width: '90px',
          boxSizing: 'border-box' as const,
        }}
        animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>
          {city}
        </p>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#10B981', margin: 0, lineHeight: 1.2 }}>
          {health}%
        </p>
      </motion.div>
    </foreignObject>
  );
}

function BengaluruCard({
  outlet, reducedMotion,
}: {
  outlet: Outlet;
  reducedMotion: boolean | null;
}) {
  // Positioned above-right of the Bengaluru marker
  const x = outlet.x + 14;
  const y = outlet.y - 112;
  return (
    <foreignObject x={x} y={y} width={152} height={100} overflow="visible" pointerEvents="none">
      <motion.div
        style={{
          background: 'linear-gradient(135deg, #0D8F63, #10B981)',
          borderRadius: '14px',
          boxShadow: '0 14px 34px rgba(16,185,129,0.32), 0 0 28px rgba(16,185,129,0.18)',
          padding: '12px 14px',
          width: '152px',
          boxSizing: 'border-box' as const,
          color: '#ffffff',
        }}
        animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <p style={{ fontSize: '11px', fontWeight: 600, margin: 0, opacity: 0.9 }}>Bengaluru</p>
        <p style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.05, margin: 0 }}>92%</p>
        <p style={{ fontSize: '11px', margin: 0, opacity: 0.85 }}>18 Staff Active</p>
        <span style={{
          display: 'inline-block',
          marginTop: '5px',
          background: 'rgba(255,255,255,0.22)',
          borderRadius: '999px',
          padding: '2px 8px',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
        }}>
          Live
        </span>
      </motion.div>
    </foreignObject>
  );
}

// ─── live badge ───────────────────────────────────────────────────────────────

function LiveStatusBar() {
  return (
    <div
      className="absolute right-6 top-6 z-10 inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-4 py-2 text-[13px] font-medium text-[#047857] shadow-landing-card"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0F8F68]" />
      </span>
      Live · Updating every 30 sec
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

type IndiaMapProps = {
  outlets?: Outlet[];
};

export const IndiaMap = memo(function IndiaMap({ outlets = OUTLETS }: IndiaMapProps) {
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxX = useTransform(mouseX, [-1, 1], [-4, 4]);
  const parallaxY = useTransform(mouseY, [-1, 1], [-3, 3]);

  const activeOutlet = useMemo(
    () => outlets.find((o) => o.id === activeId) ?? null,
    [activeId, outlets],
  );
  const primaryOutlet = useMemo(
    () => outlets.find((o) => o.isPrimary) ?? outlets[0],
    [outlets],
  );

  const handleActivate = useCallback((id: string) => setActiveId(id), []);
  const handleDeactivate = useCallback(() => setActiveId(null), []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY, reducedMotion],
  );

  return (
    <div
      className="relative h-[min(72vh,560px)] overflow-visible rounded-[32px] border border-slate-900/[0.05] bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.04)] sm:h-[480px] sm:p-5 lg:h-[620px] lg:p-6"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
        handleDeactivate();
      }}
    >
      <LiveStatusBar />

      <div className="relative h-full w-full">
        <motion.div
          className="h-full w-full"
          style={reducedMotion ? undefined : { x: parallaxX, y: parallaxY }}
        >
          {/*
           * overflow="visible" on the SVG is critical:
           * it lets foreignObject cards (& their box-shadows) render
           * outside the strict viewBox boundary without being clipped.
           */}
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-full w-full"
            overflow="visible"
            role="img"
            aria-labelledby="india-map-title"
          >
            <title id="india-map-title">India outlet network, live city health markers</title>

            {/* ── watermark map ── */}
            <image
              href="/assets/maps/india-outline.svg"
              x="0"
              y="0"
              width={VB_W}
              height={VB_H}
              opacity="0.55"
            />

            {/* ── connection lines from Bengaluru ── */}
            {outlets
              .filter((o) => !o.isPrimary)
              .map((outlet) => (
                <ConnectionLine
                  key={`${primaryOutlet.id}-${outlet.id}`}
                  from={primaryOutlet}
                  to={outlet}
                />
              ))}

            {/* ── city markers ── */}
            {outlets.map((outlet) => (
              <CityMarker
                key={outlet.id}
                outlet={outlet}
                active={activeId === outlet.id}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
              />
            ))}

            {/* ── KPI cards pinned to SVG coordinate space ── */}
            {KPI_CARDS.map((cfg) => {
              const outlet = outlets.find((o) => o.id === cfg.id);
              if (!outlet) return null;
              return (
                <KpiCard
                  key={cfg.id}
                  outlet={outlet}
                  city={cfg.city}
                  health={cfg.health}
                  dx={cfg.dx}
                  dy={cfg.dy}
                  reducedMotion={reducedMotion}
                />
              );
            })}

            {/* ── Bengaluru hero card ── */}
            <BengaluruCard outlet={primaryOutlet} reducedMotion={reducedMotion} />
          </svg>
        </motion.div>

        {/* Hover tooltip — rendered as HTML overlay, only shows on hover */}
        {activeOutlet && (
          <MapTooltip
            outlet={activeOutlet}
            anchorX={activeOutlet.x}
            anchorY={activeOutlet.y}
          />
        )}
      </div>
    </div>
  );
});
