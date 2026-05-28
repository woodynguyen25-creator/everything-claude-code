'use client';

import { useEffect, useState } from 'react';

interface TriadStatus {
  date: string;
  spend: Record<string, number>;
  total_metered_usd: number;
  deepseek_status: 'ok' | 'soft_warn' | 'hard_stop';
  deepseek_soft_threshold_usd: number;
  deepseek_hard_threshold_usd: number;
  source: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type Status = TriadStatus['deepseek_status'];

const STATUS_LABEL: Record<Status, string> = {
  ok: 'OK',
  soft_warn: 'Soft Warn',
  hard_stop: 'Hard Stop',
};

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function TriadCostMeter() {
  const [status, setStatus] = useState<TriadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/triad', { cache: 'no-store' });
        const json = (await response.json()) as ApiResponse<TriadStatus>;
        if (cancelled) return;
        if (json.success && json.data) {
          setStatus(json.data);
          setError(null);
        } else {
          setError(json.error ?? 'Failed to load triad status');
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'fetch failed');
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="triad-meter triad-meter--error">
        <span className="triad-meter__title">Triad</span>
        <span className="triad-meter__error">⚠ {error}</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="triad-meter triad-meter--loading">
        <span className="triad-meter__title">Triad</span>
        <span className="triad-meter__loading">Loading…</span>
      </div>
    );
  }

  const ds = Number(status.spend.deepseek ?? 0);
  const dsPct = Math.min(100, (ds / status.deepseek_hard_threshold_usd) * 100);
  const softPct = (status.deepseek_soft_threshold_usd / status.deepseek_hard_threshold_usd) * 100;
  const statusClass = `triad-meter--${status.deepseek_status}`;

  return (
    <div className={`triad-meter ${statusClass}`}>
      <div className="triad-meter__header">
        <span className="triad-meter__title">Triad · {status.date.slice(5)}</span>
        <span className="triad-meter__status">{STATUS_LABEL[status.deepseek_status]}</span>
      </div>

      <div className="triad-meter__totals">
        <div className="triad-meter__cell">
          <span className="triad-meter__cell-label">Metered</span>
          <span className="triad-meter__cell-value">{formatUsd(status.total_metered_usd)}</span>
        </div>
        <div className="triad-meter__cell">
          <span className="triad-meter__cell-label">DeepSeek</span>
          <span className="triad-meter__cell-value">{formatUsd(ds)}</span>
        </div>
      </div>

      <div className="triad-meter__bar" aria-label="DeepSeek spend progress toward hard cap">
        <div className="triad-meter__bar-track" />
        <div className="triad-meter__bar-fill" style={{ width: `${dsPct}%` }} />
        <div className="triad-meter__bar-marker" style={{ left: `${softPct}%` }} />
      </div>

      <div className="triad-meter__legend">
        <span>$0</span>
        <span className="triad-meter__legend-soft">soft {formatUsd(status.deepseek_soft_threshold_usd)}</span>
        <span>hard {formatUsd(status.deepseek_hard_threshold_usd)}</span>
      </div>

      {Object.keys(status.spend).length > 1 ? (
        <ul className="triad-meter__breakdown">
          {Object.entries(status.spend)
            .filter(([provider]) => provider !== 'deepseek')
            .map(([provider, amount]) => (
              <li key={provider}>
                <span>{provider}</span>
                <span>{formatUsd(amount)}</span>
              </li>
            ))}
        </ul>
      ) : null}

      <style jsx>{`
        .triad-meter {
          padding: 1rem 1.25rem;
          border-radius: 14px;
          border: 1px solid oklch(var(--color-border-subtle));
          background:
            linear-gradient(180deg,
              oklch(var(--color-bg-panel)) 0%,
              oklch(var(--color-bg-deep)) 100%);
          color: oklch(var(--color-text-primary));
          font-family: var(--font-body), system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          min-width: 260px;
          position: relative;
          overflow: hidden;
          box-shadow:
            0 1px 1px rgba(0, 0, 0, 0.4),
            0 4px 12px -4px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 240, 200, 0.04);
          transition: border-color 220ms ease, box-shadow 220ms ease;
        }

        /* Faint top-edge gold gradient — barely visible */
        .triad-meter::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            oklch(var(--color-rune-gold) / 0.3) 50%,
            transparent 100%
          );
          pointer-events: none;
        }

        .triad-meter:hover {
          border-color: oklch(var(--color-rune-gold) / 0.3);
          box-shadow:
            0 2px 2px rgba(0, 0, 0, 0.45),
            0 8px 20px -6px rgba(0, 0, 0, 0.6),
            0 0 0 1px oklch(var(--color-rune-gold) / 0.18),
            inset 0 1px 0 rgba(255, 240, 200, 0.06);
        }

        .triad-meter--soft_warn {
          border-color: oklch(var(--color-ember) / 0.25);
        }

        .triad-meter--hard_stop {
          border-color: oklch(var(--color-blood) / 0.40);
        }

        .triad-meter--hard_stop::before {
          background: linear-gradient(
            90deg,
            transparent 0%,
            oklch(var(--color-blood) / 0.5) 50%,
            transparent 100%
          );
        }

        .triad-meter--loading,
        .triad-meter--error {
          color: oklch(var(--color-text-muted));
          font-size: 0.85rem;
          gap: 0.25rem;
        }

        .triad-meter__header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .triad-meter__title {
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: oklch(var(--color-text-muted));
          font-weight: 600;
        }

        .triad-meter__status {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: oklch(var(--color-rune-gold));
        }
        .triad-meter--soft_warn .triad-meter__status {
          color: oklch(var(--color-ember));
        }
        .triad-meter--hard_stop .triad-meter__status {
          color: oklch(var(--color-blood));
          animation: triad-pulse 1.6s ease-in-out infinite;
        }

        @keyframes triad-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .triad-meter__totals {
          display: flex;
          gap: 1.5rem;
        }

        .triad-meter__cell {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .triad-meter__cell-label {
          font-size: 0.65rem;
          color: oklch(var(--color-text-muted));
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .triad-meter__cell-value {
          font-family: var(--font-mono), 'JetBrains Mono', ui-monospace, monospace;
          font-size: 1.25rem;
          color: oklch(var(--color-text-primary));
          font-variant-numeric: tabular-nums;
          font-weight: 500;
        }

        .triad-meter__bar {
          position: relative;
          height: 6px;
          border-radius: 999px;
          overflow: visible;
        }

        .triad-meter__bar-track {
          position: absolute;
          inset: 0;
          background: oklch(var(--color-bg-raised));
          border-radius: 999px;
        }

        .triad-meter__bar-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            oklch(var(--color-rune-gold) / 0.6) 0%,
            oklch(var(--color-rune-gold)) 100%
          );
          border-radius: 999px;
          transition: width 280ms cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 0 8px oklch(var(--color-rune-gold) / 0.5);
        }
        .triad-meter--soft_warn .triad-meter__bar-fill {
          background: linear-gradient(
            90deg,
            oklch(var(--color-rune-gold) / 0.6) 0%,
            oklch(var(--color-ember)) 100%
          );
          box-shadow: 0 0 10px oklch(var(--color-ember) / 0.5);
        }
        .triad-meter--hard_stop .triad-meter__bar-fill {
          background: linear-gradient(
            90deg,
            oklch(var(--color-ember)) 0%,
            oklch(var(--color-blood)) 100%
          );
          box-shadow: 0 0 12px oklch(var(--color-blood) / 0.6);
        }

        .triad-meter__bar-marker {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 2px;
          background: oklch(var(--color-ember) / 0.55);
          border-radius: 1px;
        }

        .triad-meter__legend {
          display: flex;
          justify-content: space-between;
          font-size: 0.62rem;
          color: oklch(var(--color-text-muted));
          font-family: var(--font-mono), monospace;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
        }

        .triad-meter__legend-soft {
          color: oklch(var(--color-ember) / 0.7);
        }

        .triad-meter__breakdown {
          margin: 0;
          padding: 0.4rem 0 0 0;
          border-top: 1px solid oklch(var(--color-border-subtle));
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-size: 0.75rem;
          color: oklch(var(--color-text-secondary));
          font-family: var(--font-mono), monospace;
          font-variant-numeric: tabular-nums;
        }

        .triad-meter__breakdown li {
          display: flex;
          justify-content: space-between;
        }

        @media (prefers-reduced-motion: reduce) {
          .triad-meter--hard_stop .triad-meter__status { animation: none; }
          .triad-meter__bar-fill { transition: none; }
        }
      `}</style>
    </div>
  );
}
