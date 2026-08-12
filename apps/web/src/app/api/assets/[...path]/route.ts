import { NextRequest } from 'next/server';

/**
 * Same-origin asset proxy. Browsers' <img>/<video> tags cannot send the
 * ngrok bypass header, so the free-tier tunnel serves them an HTML
 * interstitial instead of media. This edge route fetches the asset from the
 * API tunnel with the bypass header and streams it back — making previews
 * play directly on our own domain (with Range/seek support).
 */
export const runtime = 'edge';

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
).replace(/\/$/, '');

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const key = params.path.map(encodeURIComponent).join('/');
  const upstreamHeaders: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
  };
  const range = req.headers.get('range');
  if (range) upstreamHeaders.Range = range;

  const upstream = await fetch(`${API_ORIGIN}/assets/${key}`, {
    headers: upstreamHeaders,
    // Assets are immutable (UUID keys) — let the edge cache them.
    cache: 'no-store',
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Asset not found', { status: upstream.status });
  }

  const headers = new Headers();
  for (const h of [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'cache-control',
  ]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'public, max-age=86400, immutable');
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
