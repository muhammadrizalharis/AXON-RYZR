'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

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
    <main className="aurora hud-grid scanlines relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div className="pointer-events-none absolute left-4 top-4 z-0 select-none font-mono text-[10px] leading-relaxed tracking-widest text-cyan/20">
        01001010 10110100
        <br />
        11010011 00101101
        <br />
        00011001 01110010
      </div>
      <div className="pointer-events-none absolute right-4 top-4 z-0 select-none text-right font-mono text-[10px] leading-relaxed tracking-widest text-accent/25">
        SYSTEM ACCESS RESTRICTED
        <br />
        LEVEL OMEGA
        <br />
        ENCRYPTION: ACTIVE
      </div>
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-0 -translate-x-1/2 select-none font-mono text-[10px] tracking-[0.3em] text-cyan/20">
        AURA · CREATIVE STUDIO · SECURE GATEWAY
      </div>
      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}
