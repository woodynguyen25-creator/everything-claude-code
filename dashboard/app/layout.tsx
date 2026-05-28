import './globals.css';
import type { Metadata } from 'next';
import { Cinzel, Inter, JetBrains_Mono, IBM_Plex_Mono } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import RavensRoot from '@/components/RavensRoot';
import { getAgentStatuses } from '@/lib/agent-status';

export const metadata: Metadata = {
  title: 'AIOS - Command Center',
  description: "Woody's Norse-themed Claude Code OS",
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

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

const numericFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-numeric',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const agentStatuses = await getAgentStatuses();
  const operatorDateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} ${numericFont.variable} min-h-screen font-body`}>
        <div className="sm:hidden flex min-h-screen items-center justify-center px-6">
          <div className="panel max-w-md p-8 text-center">
            <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">REALM LOCK</div>
            <h1 className="mt-3 font-display text-3xl text-rune-gold">Desktop only, for now.</h1>
            <p className="mt-4 text-sm italic text-text-secondary">
              Woody&apos;s Realm is built for a wider screen. Open it from desktop or within Obsidian&apos;s Command Center pane.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex min-h-screen">
          <Sidebar agentStatuses={agentStatuses} operatorDateLabel={operatorDateLabel} />
          <main className="relative z-10 flex-1 flex flex-col overflow-x-hidden">
            <div className="flex-1">{children}</div>
          </main>
          <RavensRoot />
        </div>
      </body>
    </html>
  );
}
