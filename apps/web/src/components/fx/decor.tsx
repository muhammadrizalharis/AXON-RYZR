'use client';

import { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Corner brackets (4 corners, HUD frame)                              */
/* ------------------------------------------------------------------ */
export function Corners({
  className,
  color = 'border-cyan/70',
}: {
  className?: string;
  color?: string;
}) {
  const base = cn('absolute h-4 w-4', color);
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', className)}
    >
      <span className={cn(base, 'left-0 top-0 border-l-2 border-t-2')} />
      <span className={cn(base, 'right-0 top-0 border-r-2 border-t-2')} />
      <span className={cn(base, 'bottom-0 left-0 border-b-2 border-l-2')} />
      <span className={cn(base, 'bottom-0 right-0 border-b-2 border-r-2')} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Rotating HUD rings                                                  */
/* ------------------------------------------------------------------ */
export function HudRings({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute', className)}>
      <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-cyan/15" />
      <div className="absolute inset-[6%] animate-spin-reverse rounded-full border border-dotted border-primary/25" />
      <div
        className="absolute inset-[14%] animate-spin-slow rounded-full border border-dashed border-accent/15"
        style={{ animationDuration: '28s' }}
      />
      <div className="absolute inset-[24%] rounded-full border border-cyan/10" />
      <div className="absolute inset-[24%] animate-glow-pulse rounded-full shadow-[inset_0_0_70px_hsl(var(--primary)/0.15)]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Low-poly wireframe face (neural scan)                               */
/* ------------------------------------------------------------------ */
export function WireframeFace({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 220"
      fill="none"
      className={className}
      style={{ filter: 'drop-shadow(0 0 7px hsl(186 100% 52% / 0.75))' }}
    >
      <g stroke="hsl(186 100% 62%)" strokeWidth="1">
        <path
          d="M100 12 C58 12 40 52 42 98 C43 132 56 168 78 188 C88 198 112 198 122 188 C144 168 157 132 158 98 C160 52 142 12 100 12 Z"
          opacity="0.9"
        />
        <path d="M100 12 V208" opacity="0.22" />
        <path d="M46 84 H154" opacity="0.18" />
        <path d="M50 128 H150" opacity="0.18" />
        <path d="M58 86 L88 82" />
        <path d="M112 82 L142 86" />
        <path d="M62 98 Q74 92 86 98 Q74 104 62 98 Z" />
        <path d="M114 98 Q126 92 138 98 Q126 104 114 98 Z" />
        <path d="M100 96 L92 132 L100 138 L108 132 Z" />
        <path d="M82 156 Q100 148 118 156 Q100 166 82 156 Z" />
        <path
          d="M42 98 L62 98 M86 98 L100 96 M100 96 L114 98 M138 98 L158 98"
          opacity="0.5"
        />
        <path
          d="M58 86 L42 70 M142 86 L158 70 M62 98 L52 128 M138 98 L148 128 M92 132 L52 128 M108 132 L148 128 M82 156 L64 150 M118 156 L136 150 M64 150 L52 128 M136 150 L148 128 M82 156 L78 188 M118 156 L122 188 M100 166 L100 188"
          opacity="0.45"
        />
        <path
          d="M88 82 L100 60 L112 82 M100 60 L100 12 M100 60 L74 40 M100 60 L126 40 M74 40 L58 86 M126 40 L142 86 M74 40 L42 70 M126 40 L158 70"
          opacity="0.4"
        />
      </g>
      <g fill="hsl(186 100% 62%)">
        {[
          [100, 60],
          [74, 40],
          [126, 40],
          [58, 86],
          [142, 86],
          [92, 132],
          [108, 132],
          [82, 156],
          [118, 156],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" opacity="0.85" />
        ))}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Fingerprint with scanning beam                                      */
/* ------------------------------------------------------------------ */
export function FingerprintScan({
  className,
  delay = 0,
  accent = false,
}: {
  className?: string;
  delay?: number;
  accent?: boolean;
}) {
  const glow = accent ? 'hsl(300 90% 62%)' : 'hsl(186 100% 52%)';
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Fingerprint
        className={cn(
          'animate-glow-pulse h-full w-full',
          accent ? 'text-accent/85' : 'text-cyan/85',
        )}
        strokeWidth={1}
        style={{
          filter: `drop-shadow(0 0 8px ${glow})`,
          animationDelay: `${delay}s`,
        }}
      />
      <span
        className={cn(
          'animate-scan pointer-events-none absolute inset-x-1 h-px',
          accent ? 'bg-accent' : 'bg-cyan',
        )}
        style={{ boxShadow: `0 0 10px ${glow}`, animationDelay: `${delay}s` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small circuit trace (input decoration)                              */
/* ------------------------------------------------------------------ */
export function CircuitTrace({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 24"
      fill="none"
      className={className}
      stroke="currentColor"
    >
      <path d="M0 12 H18 L26 4 H44 L52 12 H80" strokeWidth="1" />
      <circle cx="18" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="44" cy="4" r="2" fill="currentColor" stroke="none" />
      <circle cx="52" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Floating neon particles (client-only to avoid hydration mismatch)   */
/* ------------------------------------------------------------------ */
type Dot = {
  left: number;
  size: number;
  dur: number;
  delay: number;
  color: string;
};

const PARTICLE_COLORS = [
  'hsl(186 100% 60%)',
  'hsl(265 90% 70%)',
  'hsl(300 90% 66%)',
];

export function Particles({
  count = 18,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const [dots, setDots] = useState<Dot[]>([]);

  useEffect(() => {
    setDots(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 3.5,
        dur: 9 + Math.random() * 14,
        delay: -Math.random() * 22,
        color:
          PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      })),
    );
  }, [count]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
    >
      {dots.map((d, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            background: d.color,
            boxShadow: `0 0 ${d.size * 3}px ${d.color}`,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Falling binary columns (client-only)                                */
/* ------------------------------------------------------------------ */
type RainCol = {
  left: number;
  dur: number;
  text: string;
  op: number;
  size: number;
};

export function BinaryRain({
  className,
  columns = 3,
}: {
  className?: string;
  columns?: number;
}) {
  const [cols, setCols] = useState<RainCol[]>([]);

  useEffect(() => {
    const gen = () =>
      Array.from({ length: 46 }, () => (Math.random() > 0.5 ? '1' : '0')).join(
        '\n',
      );
    setCols(
      Array.from({ length: columns }, (_, i) => {
        const t = gen();
        return {
          left: (i / columns) * 100 + Math.random() * (60 / columns),
          dur: 12 + Math.random() * 14,
          text: `${t}\n${t}`,
          op: 0.1 + Math.random() * 0.14,
          size: 9 + Math.random() * 3,
        };
      }),
    );
  }, [columns]);

  return (
    <div aria-hidden className={cn('binary-rain', className)}>
      {cols.map((c, i) => (
        <div
          key={i}
          className="binary-rain-col select-none whitespace-pre font-mono leading-relaxed text-cyan"
          style={{
            left: `${c.left}%`,
            animationDuration: `${c.dur}s`,
            opacity: c.op,
            fontSize: c.size,
          }}
        >
          {c.text}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Perspective floor grid                                              */
/* ------------------------------------------------------------------ */
export function FloorGrid({ className }: { className?: string }) {
  return <div aria-hidden className={cn('floor-grid', className)} />;
}
