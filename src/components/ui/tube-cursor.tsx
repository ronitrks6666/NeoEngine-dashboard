import { useEffect, useRef } from 'react';

export type TubesCursorProps = {
  initialColors?: string[];
  className?: string;
};

type TrailPoint = { x: number; y: number; timestamp: number };

const TubesCursor = ({
  initialColors = [
    '#00ffff', // bright cyan
    '#00ff66', // bright neon green
    '#ff00ff', // bright magenta
    '#ffff00', // bright yellow
    '#0099ff', // bright blue
    '#ff0066', // hot pink
    '#66ff00', // lime
    '#ff6600', // bright orange
  ],
  className = '',
}: TubesCursorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailsRef = useRef<TrailPoint[][]>([]);
  const rafRef = useRef<number>();
  const smoothMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const numTubes = initialColors.length;
    for (let i = 0; i < numTubes; i++) {
      trailsRef.current[i] = [];
    }

    const handleMouseMove = (e: MouseEvent) => {
      const smoothing = 0.15;
      smoothMouseRef.current.x += (e.clientX - smoothMouseRef.current.x) * smoothing;
      smoothMouseRef.current.y += (e.clientY - smoothMouseRef.current.y) * smoothing;
    };

    const updateTrails = () => {
      const now = Date.now();
      const { x, y } = smoothMouseRef.current;
      
      for (let i = 0; i < numTubes; i++) {
        const angle = (i / numTubes) * Math.PI * 2;
        const radius = 8;
        
        trailsRef.current[i].push({
          x: x + Math.cos(angle) * radius,
          y: y + Math.sin(angle) * radius,
          timestamp: now,
        });
        
        if (trailsRef.current[i].length > 120) {
          trailsRef.current[i].shift();
        }
      }
    };

    const drawTube = (points: TrailPoint[], color: string) => {
      if (points.length < 2) return;

      const now = Date.now();
      const maxAge = 1200;

      for (let layer = 0; layer < 3; layer++) {
        const lineWidth = layer === 0 ? 1.5 : layer === 1 ? 3 : 6;
        const alpha = layer === 0 ? 0.95 : layer === 1 ? 0.5 : 0.25;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const age = now - p.timestamp;
          const life = Math.max(0, 1 - age / maxAge);
          const easedLife = 1 - Math.pow(1 - life, 2);
          
          ctx.globalAlpha = alpha * easedLife;

          if (i === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            const prev = points[i - 1];
            const midX = (prev.x + p.x) / 2;
            const midY = (prev.y + p.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
        }

        if (layer === 0) {
          ctx.shadowBlur = 30;
          ctx.shadowColor = color;
        } else {
          ctx.shadowBlur = layer === 1 ? 45 : 70;
          ctx.shadowColor = color;
        }

        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      updateTrails();

      const now = Date.now();
      const maxAge = 1200;

      for (let i = 0; i < numTubes; i++) {
        trailsRef.current[i] = trailsRef.current[i].filter(
          (p) => now - p.timestamp < maxAge
        );
        
        if (trailsRef.current[i].length > 1) {
          drawTube(trailsRef.current[i], initialColors[i % initialColors.length]);
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [initialColors]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 block w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 1, opacity: 0.9 }}
      aria-hidden="true"
    />
  );
};

export { TubesCursor };
