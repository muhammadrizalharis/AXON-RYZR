'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
  BinaryRain,
  FloorGrid,
  Particles,
} from '@/components/fx/decor';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (accessToken) router.replace('/create');
  }, [accessToken, router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-24 md:py-20">
      {/* backdrop stack */}
      <div className="aurora absolute inset-0" />
      <div className="hud-grid absolute inset-0" />
      <FloorGrid />
      <BinaryRain className="inset-y-0 left-0 hidden w-36 md:block" columns={3} />
      <BinaryRain className="inset-y-0 right-0 hidden w-36 md:block" columns={3} />
      <Particles count={16} />
      <div className="scanlines absolute inset-0" />

      {/* top HUD header */}
      <header className="pointer-events-none absolute inset-x-0 top-5 z-20 flex items-start justify-between px-6">
        <pre className="hidden select-none font-mono text-[9px] leading-relaxed tracking-[0.3em] text-cyan/25 sm:block">
          {'01001010 10110100\n11010011 00101101\n00011001 01110010'}
        </pre>

        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <div className="flex items-center gap-3">
            <div className="animate-glow-pulse flex h-11 w-11 items-center justify-center rounded-full border border-cyan/50 bg-background/60 shadow-[0_0_18px_hsl(var(--cyan)/0.5)]">
              <span className="font-display text-lg font-black text-white">
                A
              </span>
            </div>
            <div className="text-left leading-none">
              <p className="font-display text-xl font-black tracking-[0.2em] text-white">
                AURA
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.42em] text-cyan/70">
                Creative Studio
              </p>
            </div>
          </div>
        </div>

        <div className="hidden text-right sm:block">
          <pre className="select-none font-mono text-[9px] leading-relaxed tracking-[0.3em] text-accent/25">
            {'0110011 101101\n1010010 010110'}
          </pre>
          <p className="text-danger-flicker mt-1 font-display text-[9px] tracking-[0.22em]">
            SYSTEM ACCESS RESTRICTED — LEVEL OMEGA
          </p>
        </div>
      </header>

      <div className="relative z-10 w-full">{children}</div>

      <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 select-none font-display text-[9px] tracking-[0.35em] text-cyan/30">
        AURA · CREATIVE STUDIO · SECURE GATEWAY
      </p>
    </main>
  );
}
