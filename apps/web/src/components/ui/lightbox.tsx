'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2, Music } from 'lucide-react';
import { downloadFile } from '@/lib/download';

/**
 * Minimal full-screen media lightbox.
 * Rendered through a portal to <body> so ancestor transforms (page fade)
 * can never trap the fixed overlay inside the scroll container.
 */
export function Lightbox({
  src,
  type,
  alt,
  filename,
  onClose,
}: {
  src: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO';
  alt?: string;
  filename?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!mounted) return null;

  const handleDownload = async () => {
    setDownloading(true);
    await downloadFile(src, filename);
    setDownloading(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="fixed inset-0 bg-background/85 backdrop-blur-md"
      />
      <div className="animate-fade-in relative z-10 max-h-[90vh] max-w-[92vw]">
        {type === 'VIDEO' ? (
          <video
            src={src}
            controls
            autoPlay
            loop
            className="max-h-[85vh] max-w-[92vw] rounded-2xl border border-cyan/30 shadow-[0_0_60px_hsl(var(--cyan)/0.2)]"
          />
        ) : type === 'AUDIO' ? (
          <div className="flex w-[min(560px,92vw)] flex-col items-center gap-6 rounded-2xl border border-accent/30 bg-card/80 p-8 shadow-[0_0_60px_hsl(var(--accent)/0.2)] backdrop-blur">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/50 bg-background/60 text-accent">
              <Music className="h-9 w-9" />
            </span>
            {alt && (
              <p className="line-clamp-3 text-center text-sm text-muted-foreground">
                {alt}
              </p>
            )}
            <audio src={src} controls autoPlay className="w-full" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? 'Preview'}
            className="max-h-[85vh] max-w-[92vw] rounded-2xl border border-cyan/30 object-contain shadow-[0_0_60px_hsl(var(--cyan)/0.2)]"
          />
        )}
        <div className="absolute -top-3 right-0 flex -translate-y-full gap-2">
          <button
            type="button"
            title="Download"
            onClick={handleDownload}
            disabled={downloading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/40 bg-card/80 text-cyan backdrop-blur transition hover:bg-cyan/10 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            title="Close (Esc)"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-card/80 text-accent backdrop-blur transition hover:bg-accent/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
