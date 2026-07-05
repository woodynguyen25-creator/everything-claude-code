'use client';

import { useEffect, useState } from 'react';

type CommandDeckEntry = {
  id: string;
  label: string;
  description: string;
};

type RunState = 'idle' | 'running' | 'done' | 'error';

type RunResult = {
  output: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
};

export default function CommandDeck() {
  const [commands, setCommands] = useState<CommandDeckEntry[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [runState, setRunState] = useState<Record<string, RunState>>({});
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/command-deck')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json.success) return;
        setEnabled(json.data.enabled);
        setCommands(json.data.commands);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(id: string) {
    setRunState((s) => ({ ...s, [id]: 'running' }));
    setOpenId(id);
    try {
      const res = await fetch('/api/command-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandId: id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'run failed');
      setResults((r) => ({ ...r, [id]: json.data }));
      setRunState((s) => ({ ...s, [id]: 'done' }));
    } catch (err) {
      setResults((r) => ({
        ...r,
        [id]: {
          output: err instanceof Error ? err.message : 'run failed',
          exitCode: -1,
          durationMs: 0,
          timedOut: false,
        },
      }));
      setRunState((s) => ({ ...s, [id]: 'error' }));
    }
  }

  if (!enabled) return null;

  const open = openId ? results[openId] : null;

  return (
    <section className="mt-6">
      <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">COMMAND DECK</div>
      <p className="mt-1 text-xs text-text-muted">
        Read-only reports — no trades, no deploys, no writes.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {commands.map((cmd) => {
          const state = runState[cmd.id] ?? 'idle';
          return (
            <button
              key={cmd.id}
              type="button"
              onClick={() => run(cmd.id)}
              disabled={state === 'running'}
              title={cmd.description}
              className="group flex flex-col items-start rounded-lg border border-border-subtle bg-bg-raised px-3 py-2.5 text-left shadow-[inset_0_1px_0_0_oklch(100%_0_0_/_0.05)] transition-all duration-150 hover:border-rune-gold/40 hover:bg-bg-hover disabled:opacity-60"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-display text-sm text-text-primary">{cmd.label}</span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    state === 'running'
                      ? 'animate-ember-pulse bg-amber-400'
                      : state === 'done'
                        ? 'bg-emerald-400'
                        : state === 'error'
                          ? 'bg-rose-500'
                          : 'bg-text-muted/40'
                  }`}
                />
              </div>
              <span className="mt-0.5 line-clamp-2 font-mono text-[10px] text-text-muted">
                {state === 'running' ? 'running…' : cmd.description}
              </span>
            </button>
          );
        })}
      </div>

      {openId && open ? (
        <div className="mt-3 rounded-lg border border-border-subtle bg-bg-deep p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
              {commands.find((c) => c.id === openId)?.label ?? openId} ·{' '}
              {open.exitCode === 0 ? `${Math.round(open.durationMs / 1000)}s` : 'failed'}
            </span>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="font-mono text-[10px] text-text-muted hover:text-rune-gold"
            >
              close
            </button>
          </div>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-text-secondary">
            {open.output || '(no output)'}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
