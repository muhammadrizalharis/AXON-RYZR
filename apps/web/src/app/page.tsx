'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function HomePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(accessToken ? '/create' : '/login');
    }, 300);
    return () => clearTimeout(timer);
  }, [accessToken, router]);

  return (
    <main className="aurora hud-grid scanlines relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-background">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-primary glow-cyan">
          <Sparkles className="h-6 w-6 animate-pulse text-white" />
        </div>
        <span className="text-2xl font-black tracking-tight holo-text">
          AURA Creative Studio
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Initializing secure studio…
      </p>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
    </main>
  );
}
