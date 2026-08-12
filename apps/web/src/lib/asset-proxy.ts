/**
 * Rewrites absolute API asset URLs (tunnel origin) to the same-origin proxy
 * route (/api/assets/*). <video>/<img> tags cannot send the ngrok bypass
 * header, so media must be served from our own domain to play inline.
 */
import { env } from './env';

const ASSET_PREFIX = `${env.apiUrl.replace(/\/$/, '')}/assets/`;

function rewriteString(value: string): string {
  return value.startsWith(ASSET_PREFIX)
    ? `/api/assets/${value.slice(ASSET_PREFIX.length)}`
    : value;
}

export function toSameOriginAssets<T>(data: T): T {
  if (typeof data === 'string') {
    return rewriteString(data) as T;
  }
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) data[i] = toSameOriginAssets(data[i]);
    return data;
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (typeof v === 'string') {
        if (key === 'url') obj[key] = rewriteString(v);
      } else if (v && typeof v === 'object') {
        toSameOriginAssets(v);
      }
    }
  }
  return data;
}
