'use client';

import { useState } from 'react';
import {
  Copy,
  Check,
  Terminal,
  KeyRound,
  Globe,
  Eye,
  EyeOff,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { env } from '@/lib/env';
import { useCurrentUser } from '@/features/auth/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { isAdminRole } from '@/components/layout/nav-items';

const CURL_EXAMPLE = `# 1) Set your endpoint once (ask the administrator for the URL)
export AXON_API="<base-url>"

# 2) Login to obtain a JWT access token
curl -X POST "$AXON_API/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your-password"}'

# 3) Call the API with the token
curl "$AXON_API/jobs" -H "Authorization: Bearer <accessToken>"`;

const ENDPOINTS = [
  { m: 'POST', p: '/auth/login', d: 'Obtain access & refresh tokens' },
  { m: 'GET', p: '/auth/me', d: 'Current authenticated user' },
  { m: 'POST', p: '/generation/image', d: 'Queue an image render' },
  { m: 'POST', p: '/generation/video', d: 'Queue a video render' },
  { m: 'GET', p: '/jobs', d: 'List your render jobs' },
  { m: 'GET', p: '/assets', d: 'List your generated assets' },
];

function RestrictedPanel() {
  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <div className="hud-panel rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/40 bg-accent/10">
          <ShieldAlert className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          API Access Restricted
        </h1>
        <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-accent/80">
          Administrator Clearance Required
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
          API credentials and endpoint documentation are only visible to
          administrators. Contact the studio administrator if you need
          programmatic access.
        </p>
      </div>
    </div>
  );
}

export default function ApiPage() {
  const { data } = useCurrentUser();
  const cached = useAuthStore((s) => s.user);
  const user = data ?? cached;
  const [copied, setCopied] = useState<string | null>(null);
  const [revealUrl, setRevealUrl] = useState(false);

  if (!isAdminRole(user?.role)) {
    return <RestrictedPanel />;
  }

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

  const maskedUrl = env.apiUrl.replace(/(https?:\/\/).+(\/api)?$/, (full) => {
    const proto = full.startsWith('https') ? 'https://' : 'http://';
    return `${proto}••••••••••••••••••••/api`;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Terminal className="h-6 w-6 text-cyan" />
          <span className="holo-text">API Access</span>
        </h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-cyan" />
          Administrator view — do not share the endpoint publicly.
        </p>
      </div>

      <section className="hud-panel rounded-2xl p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4 text-cyan" /> Base URL
        </h2>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/50 p-3">
          <code className="flex-1 truncate font-mono text-sm text-cyan">
            {revealUrl ? env.apiUrl : maskedUrl}
          </code>
          <button
            type="button"
            title={revealUrl ? 'Hide URL' : 'Reveal URL'}
            onClick={() => setRevealUrl((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan"
          >
            {revealUrl ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            title="Copy URL"
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
        <p className="mt-2 text-[11px] text-muted-foreground">
          Hidden by default. The copy button always copies the real URL.
        </p>
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
          on subsequent requests. The example uses a placeholder — never paste
          the real endpoint into shared documents.
        </p>
        <div className="relative rounded-xl border border-border/60 bg-background/60 p-4">
          <button
            type="button"
            title="Copy example"
            onClick={() => copy(CURL_EXAMPLE, 'curl')}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan"
          >
            {copied === 'curl' ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words pr-10 font-mono text-xs leading-relaxed text-foreground/90">
            {CURL_EXAMPLE}
          </pre>
        </div>
      </section>

      <section className="hud-panel rounded-2xl p-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Endpoints</h2>
        <ul className="space-y-2 text-sm">
          {ENDPOINTS.map((e) => (
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
