'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import RealmMark from '@/components/RealmMark';

type AppShellProps = {
  operatorDateLabel: string;
  children: React.ReactNode;
};

/**
 * The app chrome. Desktop: static sidebar + main. Mobile (< sm): a fixed top bar
 * with a hamburger that opens the sidebar as an off-canvas drawer. Replaces the
 * old "Desktop only" realm-lock so the dashboard is usable on a phone.
 */
export default function AppShell({ operatorDateLabel, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen">
      {/* Mobile top bar — only below sm */}
      <header className="fixed inset-x-0 top-0 z-30 flex min-h-14 items-center justify-between border-b border-border-subtle bg-bg-panel/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <RealmMark size={20} className="shrink-0" />
          <span className="truncate font-display text-sm uppercase tracking-[0.16em] text-rune-gold">
            Woody&apos;s Realm
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border-subtle text-text-secondary transition-colors hover:border-rune-gold hover:text-rune-gold"
        >
          <span className="text-lg leading-none" aria-hidden>
            ☰
          </span>
        </button>
      </header>

      {/* Backdrop behind the drawer */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
        />
      )}

      {/* Sidebar — off-canvas drawer on mobile, static aside on desktop */}
      <Sidebar operatorDateLabel={operatorDateLabel} mobileOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content */}
      <main className="relative z-10 flex min-h-screen flex-1 flex-col overflow-x-hidden pt-[calc(3.5rem+env(safe-area-inset-top))] sm:pt-0">
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
