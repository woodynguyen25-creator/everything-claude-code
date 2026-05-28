'use client';

import { useEffect, useState } from 'react';
import type { Decision } from '@/lib/olympus/types';
import { ThorChat } from '@/components/olympus/ThorChat';

interface OracleDrawerProps {
  decisionContext?: Decision | null;
}

const MAC_HINT = '⌘ K';
const WIN_HINT = 'Ctrl K';

function detectIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

export function OracleDrawer({ decisionContext }: OracleDrawerProps) {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(detectIsMac());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const hint = isMac ? MAC_HINT : WIN_HINT;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Oracle"
        className="fixed bottom-5 right-5 z-30 hidden items-center gap-2 rounded-full border border-[#C9A96155] bg-[rgba(12,10,26,0.92)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#C9A961] shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:border-[#C9A961] hover:text-white md:flex"
      >
        <span className="text-base leading-none">⚒️</span>
        <span>Summon Thor</span>
        <kbd className="rounded border border-white/[0.18] bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/72">
          {hint}
        </kbd>
      </button>

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          type="button"
          aria-label="Close Oracle"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        />

        <aside
          role="dialog"
          aria-label="Oracle — Thor"
          className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-white/[0.08] bg-[#0A0814] shadow-[-30px_0_80px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out md:w-[520px] ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/45">Oracle</span>
              <span className="text-xs uppercase tracking-[0.18em] text-[#C9A961]">Thor · Council Voice</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/[0.1] px-2 py-1 font-mono text-[10px] text-white/55 transition-colors hover:border-white/30 hover:text-white"
            >
              ESC
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ThorChat decisionContext={decisionContext} bare />
          </div>
        </aside>
      </div>
    </>
  );
}
