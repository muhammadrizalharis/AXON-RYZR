'use client';

import { useState } from 'react';
import { Copy, Check, Terminal, KeyRound, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { env } from '@/lib/env';

export default function ApiPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(key);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => toast.error('Copy failed'));
  };

  const curl = `curl -X POST ${env.apiUrl}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@unismuh.ac.id","password":"your-password"}'`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Terminal className="h-6 w-6 text-cyan" />
          <span className="holo-text">API Access</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Integrate AURA Creative Studio into your own tools.
        </p>
      </div>

      <section className="hud-panel rounded-2xl p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4 text-cyan" /> Base URL
        </h2>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/50 p-3">
          <code className="flex-1 truncate font-mono text-sm text-cyan">
            {env.apiUrl}
          </code>
          <button
            type="button"
            onClick={() => copy(env.apiUrl, 'url')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan"
          >
            {copied === 'url' ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </section>

      <section className="hud-panel rounded-2xl p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <KeyRound className="h-4 w-4 text-cyan" /> Authentication
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Authenticate with your credentials to receive a JWT access token, then
          send it as{' '}
          <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-xs text-cyan">
            Authorization: Bearer &lt;token&gt;
          </code>{' '}
          on subsequent requests.
        </p>
        <div className="relative rounded-xl border border-border/60 bg-background/60 p-4">
          <button
            type="button"
            onClick={() => copy(curl, 'curl')}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan"
          >
            {copied === 'curl' ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words pr-10 font-mono text-xs leading-relaxed text-foreground/90">
            {curl}
          </pre>
        </div>
      </section>

      <section className="hud-panel rounded-2xl p-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Endpoints</h2>
        <ul className="space-y-2 text-sm">
          {[
            { m: 'POST', p: '/auth/login', d: 'Obtain access & refresh tokens' },
            { m: 'GET', p: '/auth/me', d: 'Current authenticated user' },
            { m: 'POST', p: '/generation/image', d: 'Queue an image render' },
            { m: 'POST', p: '/generation/video', d: 'Queue a video render' },
            { m: 'GET', p: '/jobs', d: 'List your render jobs' },
            { m: 'GET', p: '/assets', d: 'List your generated assets' },
          ].map((e) => (
            <li
              key={e.p}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2"
            >
              <span className="w-12 shrink-0 rounded bg-cyan/10 px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-cyan">
                {e.m}
              </span>
              <code className="font-mono text-xs text-foreground">{e.p}</code>
              <span className="ml-auto truncate text-xs text-muted-foreground">
                {e.d}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
