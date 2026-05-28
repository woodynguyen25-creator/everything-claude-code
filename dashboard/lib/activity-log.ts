import fs from 'node:fs';
import path from 'node:path';

export type ActivityLogEntry = {
  timestamp: string;
  action: string;
  agent: string | null;
  status: 'started' | 'completed' | 'failed';
};

const logPath = path.join(process.cwd(), 'data', 'activity-log.json');

export function readActivityLog(): ActivityLogEntry[] {
  try {
    if (!fs.existsSync(logPath)) return [];
    const raw = fs.readFileSync(logPath, 'utf8');
    return JSON.parse(raw) as ActivityLogEntry[];
  } catch {
    return [];
  }
}

export function appendActivityLog(entry: ActivityLogEntry) {
  const current = readActivityLog();
  current.unshift(entry);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(current.slice(0, 500), null, 2), 'utf8');
}
