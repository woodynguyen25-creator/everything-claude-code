'use client';

import { useEffect, useCallback, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Decision } from '@/lib/olympus/types';
import { AGENT_COLORS } from '@/lib/olympus/colors';
import { DecisionDrawerCouncilSection } from './DecisionDrawerCouncilSection';
import { estimateCost, formatCost } from '@/lib/olympus/pricing';
import type { Provider } from '@/lib/olympus/pricing';

type DrawerProps = {
  decision: Decision | null;
  onClose: () => void;
};

const COUNCIL_ENTRIES = [
  { agent: 'zeus' as const,   councilKey: 'zeus_macro' as const,   label: 'Macro Context',   metaKey: 'zeus' as const },
  { agent: 'apollo' as const, councilKey: 'apollo_bull' as const,  label: 'Bull Case',       metaKey: 'apollo' as const },
  { agent: 'athena' as const, councilKey: 'athena_bear' as const,  label: 'Bear Case',       metaKey: 'athena' as const },
  { agent: 'ares' as const,   councilKey: 'ares_catalyst' as const, label: 'Catalysts',      metaKey: 'ares' as const },
  { agent: 'loki' as const,   councilKey: 'loki_redteam' as const,  label: 'Red Team',       metaKey: 'loki' as const },
];

function money(v: number | null) {
  if (v === null) return '--';
  return `$${v.toFixed(2)}`;
}

function shortDate(v: string) {
  try {
    return new Date(`${v}T12:00:00`).toLocaleDateString('en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return v;
  }
}

function totalCouncilCost(decision: Decision): number {
  if (!decision.council_metadata) return 0;
  return Object.values(decision.council_metadata).reduce((sum, meta) => {
    if (!meta) return sum;
    return sum + estimateCost(meta.provider as Provider, meta.input_tokens, meta.output_tokens);
  }, 0);
}

function rMultipleColor(r: number | null) {
  if (r === null) return 'text-white/55';
  if (r > 0) return 'text-emerald-300';
  if (r < 0) return 'text-rose-300';
  return 'text-white/55';
}

export function DecisionDrawer({ decision, onClose }: DrawerProps) {
  // ESC closes
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll while open
  useEffect(() => {
    if (decision) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [decision]);

  const isOpen = decision !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: isOpen ? 'blur(8px)' : 'none',
          WebkitBackdropFilter: isOpen ? 'blur(8px)' : 'none',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={decision ? `${decision.ticker} ${decision.right} $${decision.strike} decision detail` : 'Decision detail'}
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden md:w-[480px]"
        style={{
          background: 'rgba(12,10,26,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-24px 0 60px -10px rgba(0,0,0,0.6)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Close button — stays fixed at top of panel */}
        <div className="flex shrink-0 items-center justify-end px-5 pt-5 pb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close decision detail"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-10 md:px-8">
          {!decision ? (
            <div className="mt-16 text-center">
              <p className="text-sm text-white/40">Decision not found</p>
            </div>
          ) : (
            <DecisionDrawerBody decision={decision} />
          )}
        </div>
      </aside>
    </>
  );
}

function DecisionDrawerBody({ decision }: { decision: Decision }) {
  const accent = AGENT_COLORS.thor;
  const convictionWidth = `${Math.max(0, Math.min(decision.conviction, 10)) * 10}%`;
  const totalCost = totalCouncilCost(decision);
  const hasResolution =
    decision.status === 'win' ||
    decision.status === 'loss' ||
    decision.status === 'expired';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-sans text-3xl font-bold tracking-wide text-white">
            {decision.ticker}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
              decision.right === 'call'
                ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200'
                : 'border-rose-300/35 bg-rose-400/10 text-rose-200'
            }`}
          >
            {decision.right}
          </span>
          <span className="font-mono text-sm text-white/55">${decision.strike}</span>
        </div>
        <div className="mt-1 font-mono text-xs text-white/40">
          Expiry: {shortDate(decision.expiry)}
        </div>
      </div>

      {/* Conviction bar */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/42">Conviction</span>
          <span className="font-mono text-xs text-white/75">{decision.conviction.toFixed(1)} / 10</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r"
            style={{
              width: convictionWidth,
              backgroundImage: `linear-gradient(to right, ${accent.hex}, #ffffff88)`,
            }}
          />
        </div>
      </div>

      <hr className="border-white/[0.08]" />

      {/* Council reasoning */}
      <div className="flex flex-col gap-5">
        {COUNCIL_ENTRIES.map(({ agent, councilKey, label, metaKey }) => {
          const text = decision.council[councilKey];
          const meta = decision.council_metadata?.[metaKey];
          if (!text && !meta) return null;
          return (
            <DecisionDrawerCouncilSection
              key={agent}
              agent={agent}
              label={label}
              text={text}
              meta={meta}
            />
          );
        })}
      </div>

      {/* Resolution section (only if resolved) */}
      {hasResolution ? (
        <>
          <hr className="border-white/[0.08]" />
          <div>
            <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-white/42">
              Resolution
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/55">Outcome</span>
                <span
                  className={`font-mono text-sm font-semibold uppercase ${
                    decision.outcome === 'win'
                      ? 'text-emerald-300'
                      : decision.outcome === 'loss'
                        ? 'text-rose-300'
                        : 'text-white/50'
                  }`}
                >
                  {decision.outcome ?? '--'}
                  {decision.outcome === 'win' ? ' ✓' : decision.outcome === 'loss' ? ' ✗' : ''}
                </span>
              </div>
              {decision.exit_price !== null ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/55">Exit price</span>
                  <span className="font-mono text-sm text-white/80">{money(decision.exit_price)}</span>
                </div>
              ) : null}
              {decision.realized_r !== null ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/55">R-multiple</span>
                  <span className={`font-mono text-sm ${rMultipleColor(decision.realized_r)}`}>
                    {decision.realized_r > 0 ? '+' : ''}{decision.realized_r.toFixed(2)}R
                  </span>
                </div>
              ) : null}
              {decision.realized_pnl !== null ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/55">P&amp;L</span>
                  <span
                    className={`font-mono text-sm ${
                      decision.realized_pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {decision.realized_pnl >= 0 ? '+' : ''}${Math.abs(decision.realized_pnl).toFixed(2)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <hr className="border-white/[0.08]" />

      {/* Footer metadata */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-4">
          <span className="text-[10px] text-white/30">Decision ID</span>
          <span className="font-mono text-[10px] text-white/45 text-right break-all">
            {decision.decision_id}
          </span>
        </div>
        {decision.approved_at ? (
          <div className="flex items-start justify-between gap-4">
            <span className="text-[10px] text-white/30">Approved at</span>
            <span className="font-mono text-[10px] text-white/45 text-right">
              {new Date(decision.approved_at).toLocaleString('en-US', {
                timeZone: 'America/Chicago',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        ) : null}
        {totalCost > 0 ? (
          <div className="flex items-start justify-between gap-4">
            <span className="text-[10px] text-white/30">Est. council cost</span>
            <span className="font-mono text-[10px] text-white/45">{formatCost(totalCost)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
