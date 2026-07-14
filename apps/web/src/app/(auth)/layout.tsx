'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
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
    <main className="aurora relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-foreground"
        >
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">
            AURA Creative Studio
          </span>
        </Link>
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          UNISMUH ComputeHub · On-Premise Generative AI
        </p>
      </div>
    </main>
  );
}
