'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ConnectionsStrip from '@/components/ConnectionsStrip';
import RealmMark from '@/components/RealmMark';

type SidebarProps = {
  operatorDateLabel: string;
};

type NavItem = { href: string; label: string; icon: string };

// One navigation system. Every item is a real route — no duplicates, no top-tabs.
const NAV: NavItem[] = [
  { href: '/', label: 'Command', icon: '🏛️' },
  { href: '/war-room', label: 'War Room', icon: '👁️' },
  { href: '/throne', label: 'The Throne', icon: '♛' },
  { href: '/olympus', label: 'Olympus', icon: '⚡' },
  { href: '/memory', label: 'Memory', icon: '🧠' },
  { href: '/skills', label: 'Skills', icon: '🌳' },
  { href: '/activity', label: 'Saga', icon: '📜' },
  { href: '/hermes', label: 'Hermes', icon: '🪶' },
  { href: '/odysseus', label: 'Odysseus', icon: '🧭' },
];

export default function Sidebar({ operatorDateLabel }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <aside className="relative z-20 flex min-h-screen w-56 shrink-0 flex-col border-r border-border-subtle bg-bg-panel">
      {/* Brand */}
      <div className="border-b border-border-subtle px-4 py-5">
        <div className="flex items-center gap-2.5">
          <RealmMark size={22} className="shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-display text-lg uppercase tracking-[0.18em] text-rune-gold">Woody&apos;s Realm</div>
            <div className="font-mono text-[10px] text-text-muted">{operatorDateLabel}</div>
          </div>
        </div>
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
                  className={`flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-[13px] transition-colors ${
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
      <div className="border-t border-border-subtle px-4 py-3">
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
