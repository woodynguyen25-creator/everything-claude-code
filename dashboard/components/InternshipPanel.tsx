'use client';

import { useEffect, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import type { Internship, InternshipStatus } from '@/lib/internships';

type FormState = {
  company: string;
  role: string;
};

const STATUS_ORDER: InternshipStatus[] = [
  'offer',
  'interview',
  'phone-screen',
  'applied',
  'saved',
  'ghosted',
  'rejected',
];

const INTERNSHIP_STATUSES: InternshipStatus[] = [
  'saved',
  'applied',
  'phone-screen',
  'interview',
  'offer',
  'rejected',
  'ghosted',
];

const STATUS_STYLES: Record<InternshipStatus, string> = {
  saved: 'bg-white/10 text-text-muted',
  applied: 'bg-bifrost/15 text-bifrost',
  'phone-screen': 'bg-amber-500/15 text-amber-400',
  interview: 'bg-rune-gold/15 text-rune-gold shadow-[0_0_14px_rgba(228,179,86,0.18)]',
  offer: 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.18)]',
  rejected: 'bg-blood/20 text-text-muted opacity-60',
  ghosted: 'bg-blood/20 text-text-muted opacity-60',
};

const EMPTY_FORM: FormState = { company: '', role: '' };

function sortInternships(items: Internship[]) {
  return [...items].sort((a, b) => {
    const priorityDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function describeNext(internship: Internship) {
  const primary = internship.nextAction || internship.notes || internship.location || 'Awaiting next move';
  if (internship.nextActionDate) return `${primary} · ${internship.nextActionDate}`;
  if (internship.deadline) return `${primary} · due ${internship.deadline}`;
  return primary;
}

export default function InternshipPanel() {
  const [items, setItems] = useState<Internship[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  async function refresh() {
    try {
      setLoading(true);
      const res = await fetch('/api/internships?includeArchived=1', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Unable to load internship applications.');
      }
      const json = (await res.json()) as Internship[];
      setItems(sortInternships(json));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load internship applications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const activeItems = useMemo(() => items.filter((item) => !item.archived), [items]);
  const archivedItems = useMemo(() => items.filter((item) => item.archived), [items]);

  async function createItem() {
    if (!form.company.trim() || !form.role.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/internships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: form.company,
          role: form.role,
          nextAction: 'Apply before it cools',
        }),
      });
      if (res.ok) {
        setForm(EMPTY_FORM);
        await refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function patchItem(id: number, patch: Partial<Internship>) {
    const res = await fetch(`/api/internships/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (res.ok) {
      const updated = (await res.json()) as Internship;
      setItems((current) => sortInternships(current.map((item) => (item.id === id ? updated : item))));
    }
  }

  return (
    <section className="mx-12 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
      <div className="p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input
              value={form.company}
              onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
              placeholder="Company"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-sm text-text-primary outline-none transition-colors duration-200 placeholder:text-text-muted focus:border-rune-gold/40"
            />
            <input
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              placeholder="Role"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-sm text-text-primary outline-none transition-colors duration-200 placeholder:text-text-muted focus:border-rune-gold/40"
            />
            <button
              type="button"
              onClick={createItem}
              disabled={submitting}
              className="cursor-pointer rounded-2xl bg-rune-gold px-4 py-2 font-mono text-[11px] text-bg-deep transition-colors duration-200 hover:bg-rune-gold/90 disabled:opacity-60"
            >
              {submitting ? 'ADDING…' : '+ ADD APPLICATION'}
            </button>
          </div>
          <div className="font-mono text-[10px] text-text-muted">
            {activeItems.length} active · {activeItems.filter((item) => item.status === 'interview').length} interview
          </div>
        </div>

        {loading ? (
          <div className="grid gap-2">
            <div className="h-12 rounded-2xl bg-bg-deep shimmer" />
            <div className="h-12 rounded-2xl bg-bg-deep shimmer" />
            <div className="h-12 rounded-2xl bg-bg-deep shimmer" />
          </div>
        ) : error ? (
          <div className="flex min-h-24 items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="min-w-0 flex-1 truncate font-mono text-xs text-amber-400">{error}</div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="min-h-[44px] shrink-0 rounded border border-amber-500/25 px-3 font-mono text-[10px] text-amber-400 transition-colors hover:border-amber-400 hover:text-amber-300"
            >
              RETRY
            </button>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-sm italic text-text-muted">
            No applications on the board yet. The summer hunt begins with the next summon.
          </div>
        ) : (
          <div className="grid gap-2">
            {activeItems.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition-colors duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] md:grid-cols-[minmax(0,1.25fr)_auto_auto]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text-primary">{item.company}</div>
                  <div className="truncate text-[12px] text-text-secondary">{item.role}</div>
                  <div className="mt-1 truncate font-mono text-[10px] text-text-muted">{describeNext(item)}</div>
                </div>
                <div className="flex items-center gap-2 md:justify-center">
                  <span className={`rounded-full px-2 py-1 font-mono text-[9px] tracking-[0.2em] ${STATUS_STYLES[item.status]}`}>
                    {item.status.toUpperCase()}
                  </span>
                  <select
                    value={item.status}
                    onChange={(event) =>
                      void patchItem(item.id, {
                        status: event.target.value as InternshipStatus,
                        appliedDate:
                          event.target.value === 'applied' && !item.appliedDate
                            ? new Date().toISOString().slice(0, 10)
                            : item.appliedDate,
                      })
                    }
                    className="cursor-pointer rounded-xl border border-white/[0.08] bg-bg-panel px-2 py-1 font-mono text-[10px] text-text-secondary outline-none transition-colors duration-200 hover:border-white/[0.14] focus:border-rune-gold/40"
                  >
                    {INTERNSHIP_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void patchItem(item.id, { archived: true })}
                    className="cursor-pointer rounded-xl border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] text-text-muted transition-colors duration-200 hover:border-white/[0.14] hover:text-text-secondary"
                  >
                    Archive
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {archivedItems.length > 0 ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowArchived((current) => !current)}
              className="cursor-pointer font-mono text-[10px] text-text-muted transition-colors duration-200 hover:text-text-secondary"
            >
              {showArchived ? 'Hide archived' : `Show archived (${archivedItems.length})`}
            </button>
            {showArchived ? (
              <div className="mt-3 grid gap-2">
                {archivedItems.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 opacity-70 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text-primary">{item.company}</div>
                      <div className="truncate text-[12px] text-text-secondary">{item.role}</div>
                    </div>
                    <span className={`rounded-full px-2 py-1 font-mono text-[9px] tracking-[0.2em] ${STATUS_STYLES[item.status]}`}>
                      {item.status.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => void patchItem(item.id, { archived: false })}
                      className="cursor-pointer rounded-xl border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] text-text-muted transition-colors duration-200 hover:border-white/[0.14] hover:text-text-secondary"
                    >
                      Restore
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
