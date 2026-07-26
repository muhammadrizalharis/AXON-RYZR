'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LogOut, Wand2, CornerDownLeft } from 'lucide-react';
import {
  NAV_MAIN,
  NAV_SYSTEM,
  isAdminRole,
} from '@/components/layout/nav-items';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { useLogout } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
};

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setPalette = useUiStore((s) => s.setPalette);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey: Ctrl/Cmd+K toggles, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(!useUiStore.getState().paletteOpen);
      } else if (e.key === 'Escape') {
        setPalette(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPalette]);

  useEffect(() => {
    if (open) {
      setQ('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const nav = [...NAV_MAIN, ...NAV_SYSTEM]
      .filter((n) => !n.adminOnly || isAdminRole(user?.role))
      .map((n) => ({
        id: n.href,
        label: n.label,
        hint: n.href,
        icon: n.icon,
        run: () => router.push(n.href),
      }));
    const actions: PaletteItem[] = [
      {
        id: 'new-render',
        label: 'New Render',
        hint: 'open Creation Hub',
        icon: Wand2,
        run: () => router.push('/create'),
      },
      {
        id: 'logout',
        label: 'Sign out',
        hint: 'end session',
        icon: LogOut,
        run: () => logout.mutate(),
      },
    ];
    const all = [...nav, ...actions];
    const term = q.trim().toLowerCase();
    return term
      ? all.filter(
          (i) =>
            i.label.toLowerCase().includes(term) ||
            i.hint?.toLowerCase().includes(term),
        )
      : all;
  }, [q, user?.role, router, logout]);

  if (!open) return null;

  const runItem = (item?: PaletteItem) => {
    if (!item) return;
    setPalette(false);
    item.run();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[14vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={() => setPalette(false)}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="hud-panel animate-fade-in relative z-10 w-full max-w-lg overflow-hidden rounded-2xl shadow-[0_0_50px_hsl(var(--cyan)/0.2)]">
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-cyan" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIdx((v) => Math.min(v + 1, items.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIdx((v) => Math.max(v - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runItem(items[idx]);
              }
            }}
            placeholder="Ketik perintah atau halaman…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <kbd className="rounded border border-border/60 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">
              Tidak ada hasil untuk “{q}”.
            </li>
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => runItem(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition',
                    i === idx
                      ? 'bg-gradient-to-r from-cyan/15 to-primary/10 text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      i === idx ? 'text-cyan' : '',
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.hint && (
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {item.hint}
                    </span>
                  )}
                  {i === idx && (
                    <CornerDownLeft className="h-3.5 w-3.5 text-cyan/70" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border/60 px-4 py-2 text-center font-mono text-[10px] tracking-widest text-muted-foreground/60">
          ↑↓ navigasi · Enter buka · Ctrl+K tutup
        </div>
      </div>
    </div>
  );
}
