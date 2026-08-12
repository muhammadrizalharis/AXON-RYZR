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
    // Media is already compressed; transcoding breaks content-length.
    'accept-encoding': 'identity',
  };
  const range = req.headers.get('range');
  if (range) upstreamHeaders.Range = range;

  const upstream = await fetch(`${API_ORIGIN}/assets/${key}`, {
    headers: upstreamHeaders,
    cache: 'no-store',
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Asset not found', { status: upstream.status });
  }

  const headers = new Headers();
  for (const h of ['content-type', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  // Forward length only when the body was not re-encoded in transit.
  if (!upstream.headers.get('content-encoding')) {
    const len = upstream.headers.get('content-length');
    if (len) headers.set('content-length', len);
  }
  // Cache only full responses — partial (206) bodies must never be reused
  // by the CDN to answer plain GETs.
  headers.set(
    'cache-control',
    upstream.status === 206
      ? 'no-store'
      : 'public, max-age=31536000, immutable',
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
