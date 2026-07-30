import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '700', '900'],
});

export const metadata: Metadata = {
  title: 'AURA Creative Studio — AXON-RYZR',
  description:
    'AXON-RYZR — AI creative studio for text-to-image and text-to-video generation.',
  icons: { icon: '/favicon-64.png', apple: '/logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
};

/**
 * Runs before first paint: enables Lite Mode on low-end devices
 * (few cores / little RAM / reduced-motion) or when the user chose it
 * in Settings ('axon-perf': auto | full | lite). Prevents any flash of
 * heavy effects on potato laptops.
 */
const PERF_BOOT_SCRIPT = `(function(){try{
var m=localStorage.getItem('axon-perf')||'auto';
var weak=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4||matchMedia('(prefers-reduced-motion: reduce)').matches;
if(m==='lite'||(m==='auto'&&weak))document.documentElement.classList.add('lite');
}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: PERF_BOOT_SCRIPT }} />
      </head>
      <body
        className={`${inter.variable} ${orbitron.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
