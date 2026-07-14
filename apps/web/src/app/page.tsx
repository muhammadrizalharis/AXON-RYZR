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
    <main className="aurora flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-3 text-primary">
        <Sparkles className="h-8 w-8 animate-pulse" />
        <span className="text-2xl font-bold tracking-tight text-foreground">
          AURA Creative Studio
        </span>
      </div>
      <p className="text-sm text-muted-foreground">Loading your studio…</p>
    </main>
  );
}
