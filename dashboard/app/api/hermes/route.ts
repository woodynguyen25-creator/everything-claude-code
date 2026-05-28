import fs from 'node:fs/promises';
import { PATHS } from '@/lib/paths';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type JobConfig = {
  id: string;
  name: string;
  script: string;
  interpreter?: string;
  args?: string[];
  schedule: { time: string; days: string; tz: string; cron?: string };
  enabled: boolean;
  description: string;
};

type JobStatus = {
  lastAttempt?: string;
  lastSuccess?: string;
  lastResult?: 'success' | 'failed';
  lastError?: string;
  durationMs?: number;
};

type LocalHermesStatus = {
  startedAt: string | null;
  jobs: Record<string, JobStatus>;
};

type RemoteHermesPayload = {
  daemonStartedAt: string | null;
  daemonRunning: boolean;
  jobs: Array<JobConfig & JobStatus & { nextRun?: string }>;
  checkedAt: string;
};

const REMOTE_TIMEOUT_MS = 2000; // tight — Tailscale healthy ping is <100ms; stalls beyond 2s would freeze the embedded VS Code webview

// Module-level stale cache — survives across requests within a single Next.js dev session
// so a momentary Tailscale stall returns last known state instead of blocking the UI.
let remoteCache: { payload: RemoteHermesPayload; cachedAt: number } | null = null;
const STALE_TTL_MS = 5 * 60 * 1000; // serve cache up to 5 min old if remote unreachable

async function safeReadJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function buildNextRun(job: JobConfig): string {
  const schedule = job.schedule;
  if (!schedule?.time || !job.enabled) return 'disabled';

  const now = new Date();
  const tzLabel = schedule.tz || 'America/Chicago';

  const todayStr = now.toLocaleDateString('en-US', { timeZone: tzLabel });
  const candidate = new Date(`${todayStr} ${schedule.time}`);
  if (Number.isNaN(candidate.getTime())) return 'unknown';

  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);

  if (schedule.days === 'weekdays') {
    let safety = 0;
    while (
      ['Sat', 'Sun'].includes(
        candidate.toLocaleDateString('en-US', { timeZone: tzLabel, weekday: 'short' })
      ) &&
      safety++ < 7
    ) {
      candidate.setDate(candidate.getDate() + 1);
    }
  }

  return candidate.toLocaleString('en-US', { timeZone: tzLabel });
}

async function fetchRemote(endpoint: string): Promise<RemoteHermesPayload | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/status`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as RemoteHermesPayload;
  } catch {
    return null;
  }
}

async function getLocalStatus() {
  const [jobsConfig, statusData] = await Promise.all([
    safeReadJson<{ jobs: JobConfig[] }>(PATHS.hermesJobs, { jobs: [] }),
    safeReadJson<LocalHermesStatus>(PATHS.hermesStatus, { startedAt: null, jobs: {} }),
  ]);

  const jobs = (jobsConfig.jobs || []).map((job) => ({
    id: job.id,
    name: job.name,
    enabled: job.enabled,
    description: job.description,
    schedule: job.schedule,
    nextRun: buildNextRun(job),
    ...statusData.jobs[job.id],
  }));

  return {
    daemonStartedAt: statusData.startedAt,
    daemonRunning: statusData.startedAt != null,
    jobs,
    checkedAt: new Date().toISOString(),
    source: 'local' as const,
  };
}

export async function GET() {
  const endpoint = process.env.HERMES_ENDPOINT;

  // Try remote first if configured
  if (endpoint) {
    const remote = await fetchRemote(endpoint);
    if (remote) {
      const jobs = (remote.jobs || []).map((job) => ({
        ...job,
        nextRun: buildNextRun(job as JobConfig),
      }));
      remoteCache = { payload: { ...remote, jobs }, cachedAt: Date.now() };
      return NextResponse.json({
        daemonStartedAt: remote.daemonStartedAt,
        daemonRunning: remote.daemonRunning,
        jobs,
        checkedAt: new Date().toISOString(),
        source: 'remote' as const,
        endpoint,
      });
    }
    // Remote unreachable — serve stale cache if fresh enough, otherwise an empty error state
    if (remoteCache && Date.now() - remoteCache.cachedAt < STALE_TTL_MS) {
      return NextResponse.json({
        daemonStartedAt: remoteCache.payload.daemonStartedAt,
        daemonRunning: remoteCache.payload.daemonRunning,
        jobs: remoteCache.payload.jobs,
        checkedAt: new Date().toISOString(),
        source: 'remote-stale' as const,
        endpoint,
        cacheAgeMs: Date.now() - remoteCache.cachedAt,
      });
    }
    return NextResponse.json({
      daemonStartedAt: null,
      daemonRunning: false,
      jobs: [],
      checkedAt: new Date().toISOString(),
      source: 'remote' as const,
      endpoint,
      error: 'remote-unreachable',
    });
  }

  // No remote configured → use local hermes-status.json
  return NextResponse.json(await getLocalStatus());
}
