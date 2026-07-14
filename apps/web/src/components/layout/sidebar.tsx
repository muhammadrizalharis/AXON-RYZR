'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Wand2, Images, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/create', label: 'Create', icon: Wand2 },
  { href: '/gallery', label: 'Gallery', icon: Images },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 p-4 md:flex">
      <Link href="/create" className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">AURA</p>
          <p className="text-[10px] text-muted-foreground">Creative Studio</p>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] text-muted-foreground">
        Running on{' '}
        <span className="font-medium text-foreground">UNISMUH ComputeHub</span>{' '}
        — on-premise GPU.
      </div>
    </aside>
  );
}
