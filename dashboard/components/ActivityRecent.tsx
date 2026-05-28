'use client';

import { useEffect, useState } from 'react';

interface ActivityRow {
  timestamp: string;
  task: string;
  outcome: string;
  summary: string;
  tokens: number;
  cost: number;
  notes: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function outcomeIcon(outcome: string): string {
  if (outcome.includes('✅')) return '✓';
  if (outcome.includes('⚠')) return '!';
  if (outcome.includes('❌')) return '×';
  if (outcome.includes('🔁')) return '↻';
  return '·';
}

function outcomeClass(outcome: string): string {
  if (outcome.includes('✅')) return 'activity-row--ok';
  if (outcome.includes('⚠')) return 'activity-row--warn';
  if (outcome.includes('❌')) return 'activity-row--fail';
  if (outcome.includes('🔁')) return 'activity-row--retry';
  return 'activity-row--unknown';
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface ActivityRecentProps {
  limit?: number;
}

export function ActivityRecent({ limit = 8 }: ActivityRecentProps) {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/activity-recent?limit=${limit}`, { cache: 'no-store' });
        const json = (await response.json()) as ApiResponse<{ rows: ActivityRow[]; total: number }>;
        if (cancelled) return;
        if (json.success && json.data) {
          setRows(json.data.rows);
          setError(null);
        } else {
          setError(json.error ?? 'failed to load activity');
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
  }, [limit]);

  if (error) {
    return (
      <div className="activity-recent activity-recent--error">
        <span className="activity-recent__title">Recent activity</span>
        <span className="activity-recent__err">⚠ {error}</span>
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="activity-recent activity-recent--loading">
        <span className="activity-recent__title">Recent activity</span>
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="activity-recent">
      <div className="activity-recent__header">
        <span className="activity-recent__title">Recent activity</span>
        <span className="activity-recent__hint">last {rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="activity-recent__empty">No activity logged yet.</div>
      ) : (
        <ul className="activity-recent__list">
          {rows.map((row, idx) => (
            <li key={`${row.timestamp}-${idx}`} className={`activity-row ${outcomeClass(row.outcome)}`}>
              <span className="activity-row__icon">{outcomeIcon(row.outcome)}</span>
              <span className="activity-row__task">{row.task}</span>
              <span className="activity-row__summary" title={row.summary}>
                {row.summary || row.notes || '—'}
              </span>
              <span className="activity-row__time">{relativeTime(row.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .activity-recent {
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
          gap: 0.6rem;
          min-width: 320px;
          position: relative;
          overflow: hidden;
          box-shadow:
            0 1px 1px rgba(0, 0, 0, 0.4),
            0 4px 12px -4px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 240, 200, 0.04);
        }

        .activity-recent::before {
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

        .activity-recent--loading,
        .activity-recent--error {
          color: oklch(var(--color-text-muted));
          font-size: 0.85rem;
        }

        .activity-recent__header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .activity-recent__title {
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: oklch(var(--color-text-muted));
          font-weight: 600;
        }

        .activity-recent__hint {
          font-size: 0.65rem;
          color: oklch(var(--color-text-muted));
          font-family: var(--font-mono), monospace;
        }

        .activity-recent__empty {
          font-size: 0.85rem;
          color: oklch(var(--color-text-muted));
          font-style: italic;
        }

        .activity-recent__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .activity-row {
          display: grid;
          grid-template-columns: 1.2rem 7rem 1fr 2rem;
          gap: 0.6rem;
          align-items: baseline;
          font-size: 0.78rem;
          padding: 0.25rem 0;
          border-bottom: 1px solid oklch(var(--color-border-subtle) / 0.4);
        }
        .activity-row:last-child { border-bottom: none; }

        .activity-row__icon {
          font-family: var(--font-mono), monospace;
          font-weight: 700;
          text-align: center;
          font-size: 0.85rem;
        }
        .activity-row--ok .activity-row__icon { color: oklch(var(--color-perseus-emerald)); }
        .activity-row--warn .activity-row__icon { color: oklch(var(--color-ember)); }
        .activity-row--fail .activity-row__icon { color: oklch(var(--color-blood)); }
        .activity-row--retry .activity-row__icon { color: oklch(var(--color-bifrost)); }
        .activity-row--unknown .activity-row__icon { color: oklch(var(--color-text-muted)); }

        .activity-row__task {
          font-family: var(--font-mono), monospace;
          font-size: 0.72rem;
          color: oklch(var(--color-rune-gold));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activity-row__summary {
          color: oklch(var(--color-text-secondary));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activity-row__time {
          font-family: var(--font-mono), monospace;
          font-size: 0.7rem;
          color: oklch(var(--color-text-muted));
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}
