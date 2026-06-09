'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ConnectionsStrip from '@/components/ConnectionsStrip';
import RealmMark from '@/components/RealmMark';

type SidebarProps = {
  operatorDateLabel: string;
  /** Mobile drawer open state (ignored at sm+, where the sidebar is always visible). */
  mobileOpen?: boolean;
  /** Called when the mobile drawer should close (link tap or close button). */
  onClose?: () => void;
};

type NavItem = { href: string; label: string; icon: string };

// One navigation system. Every item is a real route — no duplicates, no top-tabs.
const NAV: NavItem[] = [
  { href: '/', label: 'Command', icon: '🏛️' },
  { href: '/war-room', label: 'War Room', icon: '👁️' },
  { href: '/olympus', label: 'Olympus Fund', icon: '⚡' },
  { href: '/memory', label: 'Memory', icon: '🧠' },
  { href: '/skills', label: 'Skills', icon: '🌳' },
  { href: '/activity', label: 'Saga', icon: '📜' },
  { href: '/hermes', label: 'Hermes', icon: '🪶' },
  { href: '/odysseus', label: 'Odysseus', icon: '🧭' },
];

export default function Sidebar({ operatorDateLabel, mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] shrink-0 transform flex-col overflow-y-auto border-r border-border-subtle bg-bg-panel transition-transform duration-300 ease-out sm:static sm:z-20 sm:w-56 sm:max-w-none sm:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2.5">
          <RealmMark size={22} className="shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-display text-lg uppercase tracking-[0.1em] text-rune-gold sm:tracking-[0.18em]">Woody&apos;s Realm</div>
            <div className="font-mono text-[10px] text-text-muted">{operatorDateLabel}</div>
          </div>
        </div>
        {/* Close button — mobile drawer only */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-subtle text-text-muted transition-colors hover:border-rune-gold hover:text-rune-gold sm:hidden"
        >
          <span className="text-base leading-none" aria-hidden>
            ✕
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-4">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex min-h-[44px] items-center gap-2.5 rounded-md border-l-2 px-3 py-2.5 text-[13px] transition-colors sm:min-h-0 ${
                    active
                      ? 'border-rune-gold bg-bg-hover text-text-primary'
                      : 'border-l-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <span className="text-[15px] leading-none" aria-hidden>{item.icon}</span>
                  <span className="font-medium tracking-wide">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border-subtle px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-2.5">
          <ConnectionsStrip />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-bifrost animate-ember-pulse" />
            localhost:3737
          </span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('ravens:open', { detail: {} }))}
            aria-label="Open the Ravens command palette"
            title="Open the Ravens (⌘K)"
            className="rounded-md border border-border-subtle px-2 py-1 font-mono text-[10px] text-text-muted transition-colors hover:border-rune-gold hover:text-rune-gold"
          >
            ⌘K
          </button>
        </div>
      </div>
    </aside>
  );
}
