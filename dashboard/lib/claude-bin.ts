import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function resolveClaudeBinary(): string {
  const explicit = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
  if (fs.existsSync(explicit)) return explicit;

  const result = spawnSync('where', ['claude'], {
    shell: true,
    encoding: 'utf8',
    timeout: 4000,
  });
  if (result.status === 0) {
    const first = result.stdout.split(/\r?\n/).find(Boolean);
    if (first) return first.trim();
  }

  return 'claude';
}

export function isClaudeAvailable(): boolean {
  const result = spawnSync(resolveClaudeBinary(), ['--version'], {
    timeout: 4000,
    encoding: 'utf8',
  });
  return result.status === 0;
}
