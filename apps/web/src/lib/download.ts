import { toast } from 'sonner';

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/flac': 'flac',
  'audio/ogg': 'ogg',
};

export function extFromMime(mime?: string | null): string {
  if (!mime) return 'bin';
  return MIME_EXT[mime] ?? mime.split('/')[1] ?? 'bin';
}

/**
 * Force a real download for cross-origin assets.
 * The `download` attribute is ignored cross-origin, so fetch as blob first;
 * falls back to opening a new tab if the fetch is blocked.
 */
export async function downloadFile(
  url: string,
  filename = 'axon-download',
): Promise<void> {
  try {
    const res = await fetch(url, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
      credentials: 'omit',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = obj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 5000);
    toast.success('Unduhan dimulai');
  } catch {
    toast.error('Unduhan langsung gagal — membuka di tab baru.');
    window.open(url, '_blank', 'noopener');
  }
}
