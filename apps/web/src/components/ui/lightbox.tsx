'use client';

import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

/**
 * Minimal full-screen media lightbox (no portal deps).
 */
export function Lightbox({
  src,
  type,
  alt,
  onClose,
}: {
  src: string;
  type: 'IMAGE' | 'VIDEO';
  alt?: string;
  onClose: () => void;
}) {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute inset-0 bg-background/85 backdrop-blur-md"
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
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? 'Preview'}
            className="max-h-[85vh] max-w-[92vw] rounded-2xl border border-cyan/30 object-contain shadow-[0_0_60px_hsl(var(--cyan)/0.2)]"
          />
        )}
        <div className="absolute -top-3 right-0 flex -translate-y-full gap-2">
          <a
            href={src}
            download
            target="_blank"
            rel="noreferrer"
            title="Download"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/40 bg-card/80 text-cyan backdrop-blur transition hover:bg-cyan/10"
          >
            <Download className="h-4 w-4" />
          </a>
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
    </div>
  );
}
