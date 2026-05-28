import { readDoctor } from '@/lib/doctor';
import { listTasks } from '@/lib/tasks';

export type RealmState = 'ok' | 'watch' | 'storm';

export type RealmStatus = {
  state: RealmState;
  label: string;
  reason: string;
};

let _cache: { value: RealmStatus; expiresAt: number } | null = null;
const CACHE_MS = 5_000;

export async function getRealmStatus(): Promise<RealmStatus> {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) {
    return _cache.value;
  }

  const doctor = await readDoctor();
  const tasks = listTasks();
  const criticalTasks = tasks.filter((task) => task.priority === 3 && task.status !== 'done');

  let value: RealmStatus;
  if ((doctor.lastRun?.deferred ?? 0) > 0 || doctor.status === 'crit') {
    value = {
      state: 'storm',
      label: 'Storm in the realm',
      reason: doctor.lastRun?.deferred
        ? `${doctor.lastRun.deferred} unresolved doctor findings need attention`
        : 'System health is critical',
    };
  } else if (doctor.status === 'warn' || criticalTasks.length > 0) {
    value = {
      state: 'watch',
      label: 'Realm under watch',
      reason: criticalTasks.length > 0
        ? `${criticalTasks.length} high-priority task${criticalTasks.length === 1 ? '' : 's'} await action`
        : doctor.message,
    };
  } else {
    value = {
      state: 'ok',
      label: 'Realm at peace',
      reason: 'No urgent issues detected',
    };
  }

  _cache = { value, expiresAt: now + CACHE_MS };
  return value;
}
