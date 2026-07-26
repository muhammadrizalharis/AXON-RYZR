'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, MobileNav } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useAuthStore } from '@/store/auth-store';
import { useJobUpdates } from '@/features/realtime/use-job-updates';
import { Particles } from '@/components/fx/decor';
import { CommandPalette } from '@/components/fx/command-palette';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [checked, setChecked] = useState(false);

  // Live job progress via Socket.IO.
  useJobUpdates();

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [accessToken, isHydrated, router]);

  if (!isHydrated || !checked) {
    return (
      <div className="aurora flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="aurora hud-grid relative flex min-h-screen bg-background">
      <Particles count={12} />
      <Sidebar />
      <MobileNav />
      <CommandPalette />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div key={pathname} className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
