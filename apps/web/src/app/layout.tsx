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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${orbitron.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
