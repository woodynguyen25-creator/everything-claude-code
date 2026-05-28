'use client';

import { useState } from 'react';
import { BookOpen, Dumbbell, Headphones, Send } from 'lucide-react';
import type { DayCheckins, HabitKey } from '@/lib/habits';

const HABITS: Array<{ key: HabitKey; label: string; icon: React.ReactNode }> = [
  {
    key: 'workout',
    label: 'Work Out',
    icon: <Dumbbell className="h-3.5 w-3.5" strokeWidth={1.8} />,
  },
  {
    key: 'read',
    label: 'Read',
    icon: <BookOpen className="h-3.5 w-3.5" strokeWidth={1.8} />,
  },
  {
    key: 'podcast',
    label: 'Podcast',
    icon: <Headphones className="h-3.5 w-3.5" strokeWidth={1.8} />,
  },
  {
    key: 'apply',
    label: 'Apply',
    icon: <Send className="h-3.5 w-3.5" strokeWidth={1.8} />,
  },
];

type Props = {
  initialCheckins: DayCheckins;
  date: string;
};

export default function DailyHabitsStrip({ initialCheckins, date }: Props) {
  const [checkins, setCheckins] = useState<DayCheckins>(initialCheckins);
  const [pending, setPending] = useState<HabitKey | null>(null);

  const toggle = async (key: HabitKey) => {
    if (pending) return;
    const next = !checkins[key];
    setPending(key);
    setCheckins((prev) => ({ ...prev, [key]: next }));
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, habit: key, completed: next }),
      });
      if (res.ok) {
        const updated: DayCheckins = await res.json();
        setCheckins(updated);
      } else {
        setCheckins((prev) => ({ ...prev, [key]: !next }));
      }
    } catch {
      setCheckins((prev) => ({ ...prev, [key]: !next }));
    } finally {
      setPending(null);
    }
  };

  const completed = Object.values(checkins).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-rune text-[9px] tracking-[0.2em] text-text-muted">TODAY&apos;S HABITS</div>
        <div className="font-mono text-[9px] text-text-muted">{completed}/4</div>
      </div>
      {HABITS.map(({ key, label, icon }) => {
        const done = checkins[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            disabled={pending === key}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all duration-200 disabled:opacity-60 ${
              done
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.10] hover:bg-white/[0.04]'
            }`}
          >
            <span className={done ? 'text-emerald-400' : 'text-text-muted'}>{icon}</span>
            <span
              className={`flex-1 font-mono text-[11px] ${
                done
                  ? 'text-text-primary line-through decoration-emerald-500/50'
                  : 'text-text-secondary'
              }`}
            >
              {label}
            </span>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                done ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'bg-white/[0.12]'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
