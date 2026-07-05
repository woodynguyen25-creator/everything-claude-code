import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Cinzel, Inter, JetBrains_Mono } from 'next/font/google';
import AppShell from '@/components/AppShell';
import RavensRoot from '@/components/RavensRoot';

export const metadata: Metadata = {
  title: 'AIOS - Command Center',
  description: "Woody's Norse-themed Claude Code OS",
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Realm',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  // Modern standard tag alongside Next's apple-mobile-web-app-capable (which is deprecated on its own).
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0c10',
};

const displayFont = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const bodyFont = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
});

// One monospace serves both code and numerics (font diet — dropped IBM Plex Mono).
const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const operatorDateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} min-h-screen font-body`}
        style={{ ['--font-numeric' as string]: 'var(--font-mono)' }}
      >
        <AppShell operatorDateLabel={operatorDateLabel}>{children}</AppShell>
        <RavensRoot />
      </body>
    </html>
  );
}
