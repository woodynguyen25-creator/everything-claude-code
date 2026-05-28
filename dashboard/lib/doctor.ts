import fs from 'node:fs/promises';
import { PATHS } from './paths';

export type DoctorFinding = {
  area: string;
  msg: string;
  severity?: 'WARN' | 'CRITICAL';
  savepointFile?: string;
  fixError?: string | null;
};

export type DoctorRun = {
  startedAt: string;
  durationMs: number;
  findings: number;
  fixed: number;
  deferred: number;
  fixedItems: DoctorFinding[];
  deferredItems: DoctorFinding[];
};

export type DoctorStatus = 'ok' | 'warn' | 'crit' | 'unknown';

export type DoctorSummary = {
  status: DoctorStatus;
  lastRun: DoctorRun | null;
  ageMinutes: number | null;
  message: string;
};

export async function readDoctor(): Promise<DoctorSummary> {
  try {
    const raw = await fs.readFile(PATHS.doctorLastRun, 'utf-8');
    const lastRun = JSON.parse(raw) as DoctorRun;
    const startedAt = new Date(lastRun.startedAt).getTime();
    const ageMinutes = Math.floor((Date.now() - startedAt) / 60_000);

    let status: DoctorStatus = 'ok';
    let message = 'All systems healthy';

    if (lastRun.deferred > 0) {
      const hasCritical = lastRun.deferredItems.some(
        (item) => item.severity === 'CRITICAL'
      );
      status = hasCritical ? 'crit' : 'warn';
      message = `${lastRun.deferred} unresolved`;
    } else if (lastRun.fixed > 0) {
      status = 'warn';
      message = `${lastRun.fixed} auto-healed`;
    }

    if (ageMinutes > 60 * 12) {
      status = 'warn';
      message = `Last run ${Math.floor(ageMinutes / 60)}h ago — Doctor may be stale`;
    }

    return { status, lastRun, ageMinutes, message };
  } catch {
    return {
      status: 'unknown',
      lastRun: null,
      ageMinutes: null,
      message: 'Awaiting first Doctor run',
    };
  }
}
