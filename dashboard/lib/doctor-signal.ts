import { readDoctor } from '@/lib/doctor';
import type { PanelSignal } from '@/types/panel-card';

export async function getDoctorSignal(): Promise<PanelSignal> {
  const doctor = await readDoctor();
  const iso = doctor.lastRun?.startedAt ?? new Date(0).toISOString();
  const staleAfterMs = 12 * 60 * 60 * 1000;
  const ageMinutes = doctor.ageMinutes ?? Number.POSITIVE_INFINITY;

  return {
    freshness: {
      iso,
      staleAfterMs,
    },
    isFresh: ageMinutes < 12 * 60,
    headline: doctor.lastRun
      ? `${doctor.lastRun.fixed} healed · ${doctor.lastRun.deferred} deferred`
      : 'Awaiting first doctor run',
    detail: doctor.message,
    nextAction:
      doctor.status === 'crit'
        ? {
            verb: 'Open Doctor log',
            href: '/api/doctor',
            hotness: 3,
          }
        : null,
    source: {
      kind: 'fs',
      path: 'C:\\Users\\woody\\.claude\\logs\\aios-doctor\\last-run.json',
    },
  };
}
