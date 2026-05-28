'use client';

import { useCallback, useEffect, useState } from 'react';

type WorkoutDay = { date: string; completed: boolean };
type CellState = 'complete' | 'rest' | 'missed';
type Cell = { date: string; state: CellState; isToday: boolean; isFuture: boolean };

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildGrid(log: WorkoutDay[]): Cell[] {
  const logMap = new Map(log.map((entry) => [entry.date, entry.completed]));
  const today = new Date();
  const todayStr = toDateStr(today);
  const cells: Cell[] = [];
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toDateStr(d);
    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;
    let state: CellState = 'rest';
    if (logMap.has(dateStr)) state = logMap.get(dateStr) ? 'complete' : 'missed';
    cells.push({ date: dateStr, state, isToday, isFuture });
  }
  return cells;
}

function computeStreak(log: WorkoutDay[]): number {
  const done = new Set(log.filter((entry) => entry.completed).map((entry) => entry.date));
  let streak = 0;
  const cursor = new Date(new Date().toISOString().slice(0, 10));
  for (let i = 0; i < 365; i++) {
    if (done.has(toDateStr(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

function totalCompleted(log: WorkoutDay[]): number {
  return log.filter((entry) => entry.completed).length;
}

function monthLabels(cells: Cell[]): Array<{ col: number; label: string }> {
  const labels: Array<{ col: number; label: string }> = [];
  let lastMonth = '';
  cells.forEach((cell, i) => {
    const col = Math.floor(i / 7);
    const month = cell.date.slice(0, 7);
    if (month !== lastMonth) {
      lastMonth = month;
      labels.push({
        col,
        label: new Date(cell.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }),
      });
    }
  });
  return labels;
}

function fmtFull(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function WorkoutPanel() {
  const [log, setLog] = useState<WorkoutDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<Cell | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/habits?habit=workout&days=91', { cache: 'no-store' });
      setLog(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCell = async (cell: Cell) => {
    if (cell.isFuture || pendingDate) return;
    const nextCompleted = cell.state !== 'complete';
    setPendingDate(cell.date);
    // optimistic update
    setLog((prev) => {
      const filtered = prev.filter((entry) => entry.date !== cell.date);
      return [...filtered, { date: cell.date, completed: nextCompleted }];
    });
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: cell.date, habit: 'workout', completed: nextCompleted }),
      });
      if (!res.ok) await load();
    } catch {
      await load();
    } finally {
      setPendingDate(null);
    }
  };

  const streak = computeStreak(log);
  const total = totalCompleted(log);
  const cells = buildGrid(log);
  const labels = monthLabels(cells);
  const cols: Cell[][] = [];
  for (let c = 0; c < 13; c++) cols.push(cells.slice(c * 7, c * 7 + 7));

  const cellClasses = (cell: Cell) => {
    const base = 'h-3 w-3 rounded-sm transition-all duration-150';
    if (cell.isFuture) return `${base} bg-transparent`;
    let color = 'bg-white/[0.06] hover:bg-white/[0.12]';
    if (cell.state === 'complete') color = 'bg-emerald-500 shadow-[0_0_4px_rgba(52,211,153,0.5)] hover:bg-emerald-400';
    else if (cell.state === 'missed') color = 'bg-rose-900/50 hover:bg-rose-800/60';
    const ring = cell.isToday ? ' ring-1 ring-rune-gold/60' : '';
    const pending = pendingDate === cell.date ? ' opacity-50' : '';
    return `${base} ${color} cursor-pointer${ring}${pending}`;
  };

  return (
    <section className="mb-0 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">TRAINING LOG</div>
            <h2 className="mt-0.5 font-display text-xl text-text-primary">Workout History</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="font-numeric text-xl text-emerald-400">{streak}</div>
              <div className="font-mono text-[9px] text-text-muted">day streak</div>
            </div>
            <div className="text-center">
              <div className="font-numeric text-xl text-text-primary">{total}</div>
              <div className="font-mono text-[9px] text-text-muted">total sessions</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-24 items-center justify-center font-mono text-[11px] text-text-muted">Loading...</div>
        ) : (
          <div>
            {/* Month labels */}
            <div className="relative mb-1 h-4">
              {labels.map(({ col, label }) => (
                <span
                  key={`${col}-${label}`}
                  className="absolute font-mono text-[9px] text-text-muted"
                  style={{ left: `${col * 15}px` }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* 13 cols × 7 rows heatmap */}
            <div className="flex gap-[3px]" onMouseLeave={() => setHoverCell(null)}>
              {cols.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((cell) => (
                    <button
                      key={cell.date}
                      type="button"
                      disabled={cell.isFuture}
                      onClick={() => toggleCell(cell)}
                      onMouseEnter={() => setHoverCell(cell)}
                      className={cellClasses(cell)}
                      aria-label={`${cell.date} — ${cell.state}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Hover detail + legend */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {[
                  { color: 'bg-emerald-500', label: 'Trained' },
                  { color: 'bg-rose-900/50', label: 'Missed' },
                  { color: 'bg-white/[0.06]', label: 'Rest' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-sm ${color}`} />
                    <span className="font-mono text-[9px] text-text-muted">{label}</span>
                  </div>
                ))}
              </div>
              <div className="font-mono text-[9px] text-text-muted h-4">
                {hoverCell && !hoverCell.isFuture ? (
                  <>
                    <span className="text-text-secondary">{fmtFull(hoverCell.date)}</span>
                    <span className="mx-1.5 text-white/20">·</span>
                    <span className={
                      hoverCell.state === 'complete' ? 'text-emerald-400' :
                      hoverCell.state === 'missed' ? 'text-rose-400' :
                      'text-text-muted'
                    }>
                      {hoverCell.state === 'complete' ? 'Trained ✓' :
                       hoverCell.state === 'missed' ? 'Missed ✗' :
                       'Click to log'}
                    </span>
                  </>
                ) : (
                  <span className="text-text-muted italic">Click any cell to toggle</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
