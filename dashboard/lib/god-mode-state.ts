import fs from 'node:fs';
import path from 'node:path';
import type { CouncilAgent } from '@/lib/council';

type PendingEntry = {
  threadId: number;
  agent: CouncilAgent;
  prompt: string;
  questions: string;
  createdAt: string;
};

const statePath = path.join(process.cwd(), 'data', 'god-mode-pending.json');

function readState(): PendingEntry[] {
  try {
    if (!fs.existsSync(statePath)) return [];
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as PendingEntry[];
  } catch {
    return [];
  }
}

function writeState(entries: PendingEntry[]) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(entries, null, 2), 'utf8');
}

export function getPendingGodMode(threadId: number) {
  return readState().find((entry) => entry.threadId === threadId) ?? null;
}

export function setPendingGodMode(entry: PendingEntry) {
  const next = readState().filter((item) => item.threadId !== entry.threadId);
  next.unshift(entry);
  writeState(next.slice(0, 100));
}

export function clearPendingGodMode(threadId: number) {
  writeState(readState().filter((entry) => entry.threadId !== threadId));
}
