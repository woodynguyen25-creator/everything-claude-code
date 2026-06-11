import fs from 'node:fs';
import path from 'node:path';
import { readAiosStats, type AiosStats } from '@/lib/aios-stats';
import { readTriadUsage } from '@/lib/triad-usage';
import { readActivityLog, type ActivityLogEntry } from '@/lib/activity-log';
import { listAllThreads } from '@/lib/chat';
import { readDoctor, type DoctorFinding } from '@/lib/doctor';
import { PATHS } from '@/lib/paths';

export type ActivityKind = 'doctor' | 'forge' | 'dream' | 'council' | 'saga' | 'triad' | 'system';

export type ActivityEvent = {
  id: string;
  timestamp: string;
  kind: ActivityKind;
  agent: string | null;
  title: string;
  detail?: string;
  cost?: number;
  source: string;
  href?: string;
};

type ActivityFilter = {
  kinds?: ActivityKind[];
  agent?: string | null;
  since?: string | null;
  limit?: number;
};

const CACHE_TTL_MS = 30 * 1000;
const sagaDir = path.join(process.env.OBSIDIAN_VAULT || path.join(process.env.USERPROFILE || '', 'Documents', 'Obsidian Vault'), 'Daily Notes');
const reportsDir = path.join(process.env.OBSIDIAN_VAULT || path.join(process.env.USERPROFILE || '', 'Documents', 'Obsidian Vault'), 'AIOS', 'Reports');

let cache:
  | {
      at: number;
      items: ActivityEvent[];
    }
  | null = null;

function readDoctorSavepointEvents() {
  const items: ActivityEvent[] = [];
  if (!fs.existsSync(PATHS.doctorSavepoints)) return items;
  const files = fs
    .readdirSync(PATHS.doctorSavepoints)
    .filter((file) => file.endsWith('.json'))
    .slice(-25);

  for (const file of files) {
    const fullPath = path.join(PATHS.doctorSavepoints, file);
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const payload = JSON.parse(raw) as DoctorFinding & { at?: string; timestamp?: string };
      const timestamp = payload.at || payload.timestamp || fs.statSync(fullPath).mtime.toISOString();
      items.push({
        id: `doctor-savepoint-${file}`,
        timestamp,
        kind: 'doctor',
        agent: null,
        title: `${payload.area || 'Doctor'} savepoint`,
        detail: payload.msg || file,
        source: fullPath,
        href: '/activity',
      });
    } catch (error) {
      console.error(`Failed to read doctor savepoint ${fullPath}.`, error);
    }
  }
  return items;
}

function readSagaEvents() {
  const items: ActivityEvent[] = [];
  if (!fs.existsSync(sagaDir)) return items;
  const files = fs
    .readdirSync(sagaDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({ file, fullPath: path.join(sagaDir, file) }))
    .sort((a, b) => fs.statSync(b.fullPath).mtimeMs - fs.statSync(a.fullPath).mtimeMs)
    .slice(0, 12);

  for (const entry of files) {
    const stat = fs.statSync(entry.fullPath);
    const raw = fs.readFileSync(entry.fullPath, 'utf8');
    const firstHeading =
      raw
        .split(/\r?\n/)
        .find((line) => line.startsWith('## ') || line.startsWith('# '))
        ?.replace(/^#+\s*/, '') ?? entry.file.replace(/\.md$/, '');
    items.push({
      id: `saga-${entry.file}`,
      timestamp: stat.mtime.toISOString(),
      kind: 'saga',
      agent: null,
      title: firstHeading,
      detail: entry.file,
      source: entry.fullPath,
      href: '/memory',
    });
  }
  return items;
}

function readDreamEvents(stats: AiosStats | null) {
  return (stats?.dreams ?? []).map((dream, index) => ({
    id: `dream-${index}-${stats?.generatedAt ?? 'none'}`,
    timestamp: stats?.generatedAt ?? new Date(0).toISOString(),
    kind: 'dream' as const,
    agent: null,
    title: dream,
    detail: 'Detected by the AIOS digest renderer.',
    source: 'data/aios-stats.json',
    href: '/',
  }));
}

function readForgeLogEvents(entries: ActivityLogEntry[]) {
  return entries.map((entry, index) => ({
    id: `forge-log-${index}-${entry.timestamp}`,
    timestamp: entry.timestamp,
    kind: 'forge' as const,
    agent: entry.agent,
    title: `${entry.action} ${entry.status}`,
    detail: `${entry.action} · ${entry.status}`,
    source: 'data/activity-log.json',
    href: '/',
  }));
}

function readTriadEvents() {
  const triad = readTriadUsage() as ReturnType<typeof readTriadUsage> & { runs?: Array<Record<string, unknown>> };
  return (triad.runs ?? []).map((run, index) => ({
    id: `triad-${index}-${String(run.ts || index)}`,
    timestamp: String(run.ts || triad.generatedAt),
    kind: 'triad' as const,
    agent: null,
    title: `${String(run.action || 'triad')} · ${String(run.stage || 'stage')} via ${String(run.provider || 'unknown')}`,
    detail: run.model ? `model: ${String(run.model)}` : undefined,
    cost: typeof run.costUsd === 'number' ? run.costUsd : undefined,
    source: 'data/triad-usage.json',
    href: '/',
  }));
}

function readCouncilEvents() {
  return listAllThreads(20).map((thread) => ({
    id: `council-${thread.id}`,
    timestamp: thread.updatedAt,
    kind: 'council' as const,
    agent: thread.agent,
    title: thread.title,
    detail: thread.preview ?? 'No words written yet.',
    source: 'data/tasks.db',
    href: `/${thread.agent}/${thread.id}`,
  }));
}

function readLoopOutputEvents() {
  const items: ActivityEvent[] = [];
  if (!fs.existsSync(reportsDir)) return items;
  const files = fs
    .readdirSync(reportsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({ file, fullPath: path.join(reportsDir, file) }))
    .sort((a, b) => fs.statSync(b.fullPath).mtimeMs - fs.statSync(a.fullPath).mtimeMs)
    .slice(0, 20);

  for (const entry of files) {
    const stat = fs.statSync(entry.fullPath);
    items.push({
      id: `report-${entry.file}`,
      timestamp: stat.mtime.toISOString(),
      kind: 'forge',
      agent: null,
      title: entry.file.replace(/\.md$/, ''),
      detail: 'AIOS report written to Obsidian.',
      source: entry.fullPath,
      href: '/activity',
    });
  }
  return items;
}

async function loadAllEvents() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.items;
  }

  const stats = readAiosStats();
  const doctor = await readDoctor();

  const items: ActivityEvent[] = [];

  items.push(...readTriadEvents());
  items.push(...readForgeLogEvents(readActivityLog()));
  items.push(...readLoopOutputEvents());
  items.push(...readDreamEvents(stats));
  items.push(...readCouncilEvents());
  items.push(...readSagaEvents());
  items.push(...readDoctorSavepointEvents());

  if (doctor.lastRun) {
    items.push({
      id: `doctor-last-run-${doctor.lastRun.startedAt}`,
      timestamp: doctor.lastRun.startedAt,
      kind: 'doctor',
      agent: null,
      title: `Doctor run · ${doctor.lastRun.fixed} healed · ${doctor.lastRun.deferred} deferred`,
      detail: doctor.message,
      source: PATHS.doctorLastRun,
      href: '/activity',
    });
  }

  items.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  cache = {
    at: Date.now(),
    items,
  };
  return items;
}

export async function listActivity(filter: ActivityFilter = {}) {
  let items = await loadAllEvents();

  if (filter.kinds?.length) {
    const kindSet = new Set(filter.kinds);
    items = items.filter((item) => kindSet.has(item.kind));
  }

  if (filter.agent) {
    items = items.filter((item) => item.agent === filter.agent);
  }

  if (filter.since) {
    const since = filter.since;
    items = items.filter((item) => item.timestamp >= since);
  }

  return items.slice(0, filter.limit ?? 100);
}
