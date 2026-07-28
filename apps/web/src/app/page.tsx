'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Logo } from '@/components/ui/logo';
import { Particles, FloorGrid, HudRings } from '@/components/fx/decor';

const BOOT_LINES = [
  '> initializing neural core…',
  '> linking GPU render grid…',
  '> establishing secure channel…',
  '> access gateway ready',
];

export default function HomePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const lineTimer = setInterval(
      () => setStep((s) => Math.min(s + 1, BOOT_LINES.length)),
      340,
    );
    const redirect = setTimeout(() => {
      router.replace(accessToken ? '/create' : '/login');
    }, BOOT_LINES.length * 340 + 500);
    return () => {
      clearInterval(lineTimer);
      clearTimeout(redirect);
    };
  }, [accessToken, router]);

  const progress = Math.min(100, Math.round((step / BOOT_LINES.length) * 100));

  return (
    <main className="aurora hud-grid scanlines relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-background px-4">
      <FloorGrid />
      <Particles count={14} />
      <HudRings className="left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 opacity-60" />

      <div className="relative z-10 flex items-center gap-3">
        <Logo className="animate-glow-pulse h-12 w-12" />
        <div className="leading-none">
          <p className="font-display text-2xl font-black tracking-[0.18em] holo-text">
            AURA
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.4em] text-cyan/70">
            Creative Studio
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-cyan/20 bg-background/60 p-4 backdrop-blur">
        <div className="min-h-[88px] space-y-1 font-mono text-xs text-cyan/90">
          {BOOT_LINES.slice(0, step).map((l) => (
            <p key={l} className="animate-fade-in">
              {l}
            </p>
          ))}
          {step < BOOT_LINES.length && <span className="type-caret">▋</span>}
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background/80">
          <div
            className="bar-sweep h-full rounded-full bg-gradient-to-r from-cyan to-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </main>
  );
}
