import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/** NeoEngine — saturated but not neon; reads on light mint backgrounds */
export const LANDING_TUBE_COLORS = ['#2dd4bf', '#14b8a6', '#0d9488'] as const;
export const LANDING_LIGHT_COLORS = ['#a7f3d0', '#6ee7b3', '#5eead4', '#2dd4bf'] as const;

type TubesApp = {
  tubes?: {
    setColors: (c: string[]) => void;
    setLightsColors: (c: string[]) => void;
  };
  dispose?: () => void;
};

export type TubesCursorProps = {
  title?: string;
  subtitle?: string;
  caption?: string;
  initialColors?: string[];
  lightColors?: string[];
  lightIntensity?: number;
  titleSize?: string;
  subtitleSize?: string;
  captionSize?: string;
  enableRandomizeOnClick?: boolean;
  /**
   * `fullscreen` = fixed viewport layer (affects everything below — dulls translucent sections).
   * `hero` = `absolute inset-0` inside a `relative` parent (recommended for landing).
   */
  variant?: 'fullscreen' | 'hero';
  className?: string;
  canvasClassName?: string;
  showHeroText?: boolean;
};

const TUBES_MODULE_URL =
  'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';

function randomColors(count: number) {
  return new Array(count).fill(0).map(
    () =>
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0'),
  );
}

const TubesCursor = ({
  title = 'Tubes',
  subtitle = 'Cursor',
  caption = 'WebGPU / WebGL',
  showHeroText = false,
  variant = 'fullscreen',
  initialColors = [...LANDING_TUBE_COLORS],
  lightColors = [...LANDING_LIGHT_COLORS],
  lightIntensity = showHeroText ? 105 : variant === 'hero' ? 92 : 92,
  titleSize = 'text-[80px]',
  subtitleSize = 'text-[60px]',
  captionSize = 'text-base',
  enableRandomizeOnClick = false,
  className,
  canvasClassName,
}: TubesCursorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<TubesApp | null>(null);

  const tubesKey = initialColors.join(',');
  const lightsKey = lightColors.join(',');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let removeClick: (() => void) | null = null;
    let destroyed = false;

    void (async () => {
      try {
        const mod = await import(
          /* @vite-ignore */
          TUBES_MODULE_URL
        );
        const TubesCursorCtor = (mod as { default?: unknown }).default ?? mod;
        if (typeof TubesCursorCtor !== 'function') return;

        if (!canvasRef.current || destroyed) return;

        const app = (
          TubesCursorCtor as (
            el: HTMLCanvasElement,
            opts: {
              tubes: {
                colors: string[];
                lights: { intensity: number; colors: string[] };
              };
            },
          ) => TubesApp
        )(canvasRef.current, {
          tubes: {
            colors: [...initialColors],
            lights: {
              intensity: lightIntensity,
              colors: [...lightColors],
            },
          },
        });

        appRef.current = app;

        if (enableRandomizeOnClick) {
          const handler = () => {
            const colors = randomColors(initialColors.length);
            const lights = randomColors(lightColors.length);
            app.tubes?.setColors(colors);
            app.tubes?.setLightsColors(lights);
          };
          document.body.addEventListener('click', handler);
          removeClick = () => document.body.removeEventListener('click', handler);
        }
      } catch {
        // CDN / WebGL unavailable — fail silently on landing
      }
    })();

    return () => {
      destroyed = true;
      removeClick?.();
      try {
        appRef.current?.dispose?.();
        appRef.current = null;
      } catch {
        // ignore
      }
    };
  }, [tubesKey, lightsKey, lightIntensity, enableRandomizeOnClick]);

  if (showHeroText) {
    return (
      <div className={cn('relative h-screen w-screen overflow-hidden', className)}>
        <canvas
          ref={canvasRef}
          className={cn('fixed inset-0 block h-full w-full', canvasClassName)}
          aria-hidden
        />
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-2 select-none">
          <h1
            className={cn(
              'm-0 p-0 text-white font-bold uppercase leading-none drop-shadow-[0_0_20px_rgba(0,0,0,1)]',
              titleSize,
            )}
          >
            {title}
          </h1>
          <h2
            className={cn(
              'm-0 p-0 text-white font-medium uppercase leading-none drop-shadow-[0_0_20px_rgba(0,0,0,1)]',
              subtitleSize,
            )}
          >
            {subtitle}
          </h2>
          <p
            className={cn(
              'm-0 p-0 text-white leading-none drop-shadow-[0_0_20px_rgba(0,0,0,1)]',
              captionSize,
            )}
          >
            {caption}
          </p>
        </div>
      </div>
    );
  }

  const hero = variant === 'hero';

  return (
    <div
      className={cn(
        'pointer-events-none isolate overflow-hidden',
        hero
          ? 'absolute inset-0 z-0 min-h-full w-full'
          : 'fixed inset-0 z-0 w-full',
        className,
      )}
      aria-hidden
    >
      {/*
        Fullscreen: landing uses opaque section BGs so UI doesn’t composite over the canvas.
        Never mix-blend-* — that tints the whole page. Hero variant = local clip only.
      */}
      <canvas
        ref={canvasRef}
        className={cn(
          'block max-h-none bg-emerald-50',
          hero
            ? 'absolute inset-0 h-full w-full min-h-[280px] opacity-[0.36]'
            : 'h-full w-full opacity-[0.26]',
          canvasClassName,
        )}
      />
    </div>
  );
};

export { TubesCursor };
