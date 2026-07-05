import { spawn } from 'node:child_process';
import { resolveClaudeBinary } from '@/lib/claude-bin';
import { appendActivityLog } from '@/lib/activity-log';

export type CommandDeckId =
  | 'doctor'
  | 'repo-scan'
  | 'skill-stocktake'
  | 'harness-audit'
  | 'skill-health'
  | 'prune';

export type CommandDeckDefinition = {
  id: CommandDeckId;
  label: string;
  description: string;
  prompt: string;
};

// READ-ONLY reports/scans only — no trades, no deploys, no file writes.
// Every run is forced to Read/Grep/Glob only via --allowedTools below, so
// even if a skill's instructions suggest edits, the invoked process cannot
// act on them — it can only read the repo and report back as text.
export const COMMAND_DECK: CommandDeckDefinition[] = [
  {
    id: 'doctor',
    label: 'Doctor',
    description: 'System health check across agents, hooks, and config',
    prompt: '/doctor',
  },
  {
    id: 'repo-scan',
    label: 'Repo Scan',
    description: 'Scan the ECC repo for issues and stale conventions',
    prompt: '/repo-scan',
  },
  {
    id: 'skill-stocktake',
    label: 'Skill Stocktake',
    description: 'Audit installed skills for relevance and overlap',
    prompt: '/skill-stocktake',
  },
  {
    id: 'harness-audit',
    label: 'Harness Audit',
    description: 'Review agent harness config for reliability and cost',
    prompt: '/harness-audit',
  },
  {
    id: 'skill-health',
    label: 'Skill Health',
    description: 'Check skill freshness and usage patterns',
    prompt: '/skill-health',
  },
  {
    id: 'prune',
    label: 'Prune Report',
    description: 'Report dead code and unused dependencies (report-only)',
    prompt: '/prune',
  },
];

const TIMEOUT_MS = 120_000;
const READ_ONLY_TOOLS = 'Read,Grep,Glob';

export type CommandDeckResult = {
  id: CommandDeckId;
  output: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
};

export function findCommandDeckEntry(id: string): CommandDeckDefinition | undefined {
  return COMMAND_DECK.find((entry) => entry.id === id);
}

export function runCommandDeckEntry(entry: CommandDeckDefinition): Promise<CommandDeckResult> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    appendActivityLog({
      timestamp: new Date().toISOString(),
      action: `Command Deck: ${entry.label} started`,
      agent: null,
      status: 'started',
    });

    // --allowedTools is variadic (<tools...>) and would otherwise swallow a
    // trailing positional prompt argument, so the prompt is fed via stdin
    // instead of as an argv entry.
    const child = spawn(
      resolveClaudeBinary(),
      ['-p', '--output-format', 'text', '--allowedTools', READ_ONLY_TOOLS],
      {
        cwd: process.cwd(),
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      }
    );

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      appendActivityLog({
        timestamp: new Date().toISOString(),
        action: `Command Deck: ${entry.label} failed to spawn`,
        agent: null,
        status: 'failed',
      });
      reject(new Error(`command deck spawn failed: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      const exitCode = code ?? -1;
      const status = timedOut || exitCode !== 0 ? 'failed' : 'completed';
      appendActivityLog({
        timestamp: new Date().toISOString(),
        action: `Command Deck: ${entry.label} ${status}`,
        agent: null,
        status,
      });
      resolve({
        id: entry.id,
        output: timedOut
          ? `${stdout.trim()}\n\n[timed out after ${TIMEOUT_MS}ms]`
          : exitCode !== 0
            ? `${stdout.trim()}\n\n[stderr] ${stderr.slice(0, 800)}`
            : stdout.trim(),
        exitCode,
        durationMs,
        timedOut,
      });
    });

    child.stdin?.write(entry.prompt);
    child.stdin?.end();
  });
}
