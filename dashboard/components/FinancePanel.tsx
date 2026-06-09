'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Check, X } from 'lucide-react';

type Paycheck = { date: string; grossPay: number; netPay: number; employer: string; notes: string };
type SavingsGoal = { name: string; target: number; current: number };
type FinancesPayload = {
  paychecks: Paycheck[];
  monthlyBudget: Record<string, number>;
  savingsGoal: SavingsGoal | null;
  currentMonthNet: number;
  nextPayDate: string | null;
  totalBudget: number;
  budgetUsedPct: number;
};

function fmt(n: number): string {
  return n === 0 ? '$—' : `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FinancePanel() {
  const [data, setData] = useState<FinancesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<string>('');
  const [editingSavings, setEditingSavings] = useState(false);
  const [savingsDraft, setSavingsDraft] = useState<string>('');
  const [showAddPaycheck, setShowAddPaycheck] = useState(false);
  const [newPay, setNewPay] = useState<{ date: string; netPay: string }>({ date: todayStr(), netPay: '' });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/finances', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Unable to load finances.');
      }
      setError(null);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load finances.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/finances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) setData(await res.json());
  };

  const startEditBudget = (key: string, value: number) => {
    setEditingBudget(key);
    setBudgetDraft(String(value));
  };

  const saveBudget = async () => {
    if (!editingBudget) return;
    const v = parseFloat(budgetDraft);
    if (isNaN(v) || v < 0) { setEditingBudget(null); return; }
    await patch({ monthlyBudget: { [editingBudget]: v } });
    setEditingBudget(null);
  };

  const startEditSavings = () => {
    setEditingSavings(true);
    setSavingsDraft(String(data?.savingsGoal?.current ?? 0));
  };

  const saveSavings = async () => {
    const v = parseFloat(savingsDraft);
    if (isNaN(v) || v < 0) { setEditingSavings(false); return; }
    await patch({ savingsCurrent: v });
    setEditingSavings(false);
  };

  const addPaycheck = async () => {
    const netPay = parseFloat(newPay.netPay);
    if (isNaN(netPay) || netPay <= 0 || !newPay.date) return;
    await patch({
      addPaycheck: {
        date: newPay.date,
        grossPay: Math.round(netPay * 1.25),
        netPay,
        employer: 'Part-time',
        notes: '',
      },
    });
    setNewPay({ date: todayStr(), netPay: '' });
    setShowAddPaycheck(false);
  };

  const pct = data?.budgetUsedPct ?? 0;
  const barColor = pct > 95 ? 'bg-rose-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500';
  const pctColor = pct > 95 ? 'text-rose-400' : pct > 80 ? 'text-amber-400' : 'text-emerald-400';
  const free = (data?.currentMonthNet ?? 0) - (data?.totalBudget ?? 0);
  const savingsProgress = data?.savingsGoal && data.savingsGoal.target > 0
    ? Math.min(100, Math.round((data.savingsGoal.current / data.savingsGoal.target) * 100))
    : 0;

  return (
    <section className="mb-0 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">FINANCES</div>
            <h2 className="mt-0.5 font-display text-xl text-text-primary">Budget Tracker</h2>
          </div>
          {data?.nextPayDate && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-center">
              <div className="font-mono text-[9px] text-text-muted">NEXT PAY</div>
              <div className="font-numeric text-sm text-rune-gold">{fmtDate(data.nextPayDate)}</div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-4 text-center font-mono text-[11px] text-text-muted">Loading...</div>
        ) : error && !data ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] px-4 py-4 text-center">
            <div className="font-mono text-[10px] text-rose-300">{error}</div>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 rounded border border-rose-500/25 px-3 py-1 font-mono text-[10px] text-rose-200 transition-colors hover:border-rose-400 hover:text-rose-100"
            >
              RETRY
            </button>
          </div>
        ) : (
          <>
            {/* Top metrics — 3 cards */}
            {error ? (
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] px-3 py-2">
                <span className="font-mono text-[10px] text-rose-300">{error}</span>
                <button
                  type="button"
                  onClick={refresh}
                  className="rounded border border-rose-500/25 px-2 py-1 font-mono text-[9px] text-rose-200 transition-colors hover:border-rose-400 hover:text-rose-100"
                >
                  RETRY
                </button>
              </div>
            ) : null}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="font-mono text-[9px] text-text-muted">THIS MONTH</div>
                <div className="mt-1 font-numeric text-xl text-text-primary">{fmt(data?.currentMonthNet ?? 0)}</div>
                <div className="mt-0.5 font-mono text-[9px] text-text-muted">net income</div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="font-mono text-[9px] text-text-muted">COMMITTED</div>
                <div className={`mt-1 font-numeric text-xl ${pctColor}`}>{pct}%</div>
                <div className="mt-1.5 h-1 w-full rounded-full bg-bg-deep overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="font-mono text-[9px] text-text-muted">FREE</div>
                <div className={`mt-1 font-numeric text-xl ${free >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(free)}</div>
                <div className="mt-0.5 font-mono text-[9px] text-text-muted">left over</div>
              </div>
            </div>

            {/* Budget breakdown — inline editable */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono text-[9px] tracking-[0.2em] text-text-muted">BUDGET CATEGORIES</div>
                <div className="font-mono text-[9px] text-text-muted">{fmt(data?.totalBudget ?? 0)}/mo</div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(data?.monthlyBudget ?? {}).map(([key, val]) => (
                  <div
                    key={key}
                    className="group flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2 hover:border-white/[0.10]"
                  >
                    <span className="font-mono text-[10px] capitalize text-text-secondary">{key}</span>
                    {editingBudget === key ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="number"
                          value={budgetDraft}
                          onChange={(e) => setBudgetDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveBudget();
                            if (e.key === 'Escape') setEditingBudget(null);
                          }}
                          className="w-16 rounded bg-bg-deep px-1.5 py-0.5 font-numeric text-[11px] text-right text-text-primary outline-none focus:ring-1 focus:ring-rune-gold"
                        />
                        <button onClick={saveBudget} className="text-emerald-400 hover:text-emerald-300 cursor-pointer">
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setEditingBudget(null)} className="text-text-muted hover:text-text-secondary cursor-pointer">
                          <X className="h-3 w-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditBudget(key, val)}
                        className="flex items-center gap-1.5 cursor-pointer text-text-primary hover:text-rune-gold transition-colors"
                      >
                        <span className="font-numeric text-[11px]">{fmt(val)}</span>
                        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Savings goal */}
            {data?.savingsGoal && (
              <div className="mb-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[9px] tracking-[0.2em] text-emerald-400/70">SAVINGS GOAL</div>
                    <div className="font-display text-sm text-text-primary">{data.savingsGoal.name}</div>
                  </div>
                  <div className="text-right">
                    {editingSavings ? (
                      <div className="flex items-center gap-1">
                        <span className="font-numeric text-[11px] text-text-muted">$</span>
                        <input
                          autoFocus
                          type="number"
                          value={savingsDraft}
                          onChange={(e) => setSavingsDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveSavings();
                            if (e.key === 'Escape') setEditingSavings(false);
                          }}
                          className="w-20 rounded bg-bg-deep px-1.5 py-0.5 font-numeric text-[12px] text-right text-text-primary outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                        <button onClick={saveSavings} className="text-emerald-400 cursor-pointer">
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startEditSavings}
                        className="group flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="font-numeric text-sm text-text-primary">{fmt(data.savingsGoal.current)}</span>
                        <span className="font-mono text-[10px] text-text-muted">/ {fmt(data.savingsGoal.target)}</span>
                        <Pencil className="h-2.5 w-2.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-bg-deep overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                    style={{ width: `${savingsProgress}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[9px] text-text-muted">
                  <span>{savingsProgress}% complete</span>
                  <span>{fmt(data.savingsGoal.target - data.savingsGoal.current)} to go</span>
                </div>
              </div>
            )}

            {/* Recent paychecks */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono text-[9px] tracking-[0.2em] text-text-muted">RECENT PAYCHECKS</div>
                <button
                  onClick={() => setShowAddPaycheck((v) => !v)}
                  className="flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 font-mono text-[9px] text-text-muted hover:border-rune-gold hover:text-rune-gold transition-colors cursor-pointer"
                >
                  <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
                  ADD
                </button>
              </div>

              {showAddPaycheck && (
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-rune-gold/20 bg-rune-gold/[0.04] px-3 py-2">
                  <input
                    type="date"
                    value={newPay.date}
                    onChange={(e) => setNewPay((p) => ({ ...p, date: e.target.value }))}
                    className="rounded bg-bg-deep px-2 py-1 font-mono text-[10px] text-text-secondary outline-none focus:ring-1 focus:ring-rune-gold [color-scheme:dark]"
                  />
                  <input
                    type="number"
                    placeholder="net pay"
                    value={newPay.netPay}
                    onChange={(e) => setNewPay((p) => ({ ...p, netPay: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') addPaycheck(); }}
                    className="flex-1 rounded bg-bg-deep px-2 py-1 font-numeric text-[11px] text-right text-text-primary outline-none focus:ring-1 focus:ring-rune-gold"
                  />
                  <button onClick={addPaycheck} className="text-emerald-400 hover:text-emerald-300 cursor-pointer">
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                  <button onClick={() => setShowAddPaycheck(false)} className="text-text-muted hover:text-text-secondary cursor-pointer">
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                {data?.paychecks.slice(0, 4).map((p) => (
                  <div
                    key={p.date}
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-text-muted">{fmtDate(p.date)}</span>
                      <span className="font-mono text-[9px] text-text-muted">{p.employer}</span>
                    </div>
                    <span className={`font-numeric text-[13px] ${p.netPay === 0 ? 'text-text-muted' : 'text-text-primary'}`}>
                      {fmt(p.netPay)}
                    </span>
                  </div>
                ))}
                {(!data?.paychecks || data.paychecks.length === 0) && (
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-3 text-center font-mono text-[10px] italic text-text-muted">
                    No paychecks logged. Add your first one.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
