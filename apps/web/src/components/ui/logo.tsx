/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';

/** AXON brand mark (apps/web/public/logo.png). */
export function Logo({
  className,
  glow = true,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <img
      src="/logo.png"
      alt="AXON logo"
      className={cn(
        'rounded-xl object-cover',
        glow && 'shadow-[0_0_18px_hsl(var(--cyan)/0.45)]',
        className,
      )}
    />
  );
}
