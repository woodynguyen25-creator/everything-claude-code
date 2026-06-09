import { listTasks } from '@/lib/tasks';
import { ActivityRings } from '@/components/ui/ActivityRings';
import { readActivityLog } from '@/lib/activity-log';
import { getTodayCheckins } from '@/lib/habits';
import DailyHabitsStrip from '@/components/DailyHabitsStrip';

export default function DailyRitesPanel() {
  const allTasks = listTasks();
  const activityLog = readActivityLog();

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const forgeRuns = activityLog.filter(
    (e) => e.status === 'completed' && e.timestamp.startsWith(todayPrefix)
  ).length;

  const openTasks = allTasks.filter((t) => t.status !== 'done');
  const visibleTasks = openTasks.slice(0, 4);

  // Body ring driven by daily habits completion (0-4 → mapped to 0-3)
  const todayCheckins = getTodayCheckins();
  const habitsCompleted = Object.values(todayCheckins).filter(Boolean).length;
  const bodyValue = Math.round((habitsCompleted / 4) * 3);

  const rings = [
    {
      label: 'Body',
      value: bodyValue,
      max: 3,
      color: 'oklch(var(--color-ember))',
    },
    {
      label: 'Mind',
      value: Math.min(3, forgeRuns),
      max: 3,
      color: 'oklch(var(--color-bifrost))',
    },
    {
      label: 'Craft',
      value: Math.max(0, Math.min(3, openTasks.length === 0 ? 3 : 4 - openTasks.length)),
      max: 3,
      color: 'oklch(var(--color-rune-gold))',
    },
  ];

  return (
    <section className="mx-12 mb-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
      <div className="p-6">
        {/* Header row */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">TODAY&apos;S RITES</div>
            <h2 className="mt-0.5 font-display text-xl text-text-primary">Daily Command</h2>
          </div>
          <div className="font-mono text-[10px] text-text-muted">
            {new Date().toLocaleDateString('en-US', {
              timeZone: 'America/Chicago',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* 3-column: rings | habits | tasks */}
        <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-[auto_minmax(0,200px)_1fr]">
          {/* Activity rings + labels */}
          <div className="flex flex-col items-center gap-3">
            <ActivityRings rings={rings} />
            <div className="grid grid-cols-3 gap-3 text-center">
              {rings.map((ring) => (
                <div key={ring.label}>
                  <div className="font-numeric text-sm text-text-primary">
                    {ring.value}/{ring.max}
                  </div>
                  <div className="text-[9px] text-text-muted">{ring.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily habits checklist — client island */}
          <DailyHabitsStrip initialCheckins={todayCheckins} date={todayPrefix} />

          {/* Task list */}
          <div className="flex flex-col gap-2 min-w-0">
            <div className="text-rune text-[9px] tracking-[0.2em] text-text-muted mb-1">
              OPEN TASKS · {openTasks.length}
            </div>

            {visibleTasks.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs italic text-text-muted">
                The forge rests. All rites complete.
              </div>
            ) : (
              visibleTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-colors ${
                    task.priority === 3
                      ? 'border-ember/25 bg-ember/[0.08]'
                      : task.priority === 2
                        ? 'border-white/[0.07] bg-bifrost/[0.05]'
                        : 'border-white/[0.05] bg-white/[0.03]'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      task.priority === 3
                        ? 'bg-ember shadow-[0_0_4px_rgba(255,100,50,0.6)]'
                        : task.priority === 2
                          ? 'bg-bifrost shadow-[0_0_4px_rgba(96,165,250,0.4)]'
                          : 'bg-text-muted'
                    }`}
                  />
                  <span className="text-[12px] leading-snug text-text-secondary">{task.title}</span>
                </div>
              ))
            )}

            {openTasks.length > 4 && (
              <div className="pl-1 text-[10px] text-text-muted">
                +{openTasks.length - 4} more tasks
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
