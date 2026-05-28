import fs from 'node:fs';
import { readAiosStats } from '@/lib/aios-stats';
import { readActivityLog } from '@/lib/activity-log';
import { PATHS } from '@/lib/paths';
import { getRealmStatus } from '@/lib/realm-status';
import { listTasks } from '@/lib/tasks';
import { readUsageData } from '@/lib/usage-data';
import { readTriadStatus } from '@/lib/triad-status';

type PulseCell = {
  label: string;
  value: string;
  detail: string;
};

function readHermesCount() {
  try {
    const raw = fs.readFileSync(PATHS.hermesJobs, 'utf8');
    const parsed = JSON.parse(raw) as { jobs?: Array<{ enabled?: boolean }> };
    return (parsed.jobs ?? []).filter((job) => job.enabled !== false).length;
  } catch {
    return 0;
  }
}

export default async function SystemPulseStrip() {
  const realm = await getRealmStatus();
  const stats = readAiosStats();
  const usage = readUsageData();
  const tasks = listTasks().filter((task) => task.status !== 'done');
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const forgeRuns = readActivityLog().filter(
    (entry) => entry.status === 'completed' && entry.timestamp.startsWith(todayPrefix)
  ).length;
  const mcpCount = Array.from(
    new Map((stats?.mcps ?? []).map((mcp) => [mcp.replace(/-mcp$/i, ''), true])).keys()
  ).length;
  const hermesCount = readHermesCount();
  const triad = readTriadStatus();
  const triadValue = `$${triad.totalMeteredUsd.toFixed(2)}`;
  const triadDetail =
    triad.deepseekStatus === 'hard_stop'
      ? `DeepSeek $${triad.deepseekSpentUsd.toFixed(2)} — HARD STOP, routing to Codex`
      : triad.deepseekStatus === 'soft_warn'
        ? `DeepSeek $${triad.deepseekSpentUsd.toFixed(2)} — soft warn`
        : `DeepSeek $${triad.deepseekSpentUsd.toFixed(2)} of $${triad.deepseekHardThresholdUsd.toFixed(2)} cap`;

  const cells: PulseCell[] = [
    { label: 'REALM', value: realm.state.toUpperCase(), detail: realm.reason },
    {
      label: 'HERMES',
      value: `${hermesCount}`,
      detail: hermesCount === 1 ? '1 active job' : `${hermesCount} active jobs`,
    },
    {
      label: 'MCP',
      value: `${mcpCount}`,
      detail: mcpCount === 1 ? '1 server surfaced' : `${mcpCount} servers surfaced`,
    },
    {
      label: 'TOKENS',
      value: `${usage.fiveHour.percent.toFixed(0)}%`,
      detail: `${usage.fiveHour.weightedTokens.toLocaleString()} / ${usage.fiveHour.ceiling.toLocaleString()} in 5h`,
    },
    {
      label: 'FORGE',
      value: `${forgeRuns}`,
      detail: forgeRuns === 1 ? '1 completed run today' : `${forgeRuns} completed runs today`,
    },
    {
      label: 'TASKS',
      value: `${tasks.length}`,
      detail: `${tasks.filter((task) => task.priority === 3).length} critical still open`,
    },
    {
      label: 'TRIAD',
      value: triadValue,
      detail: triadDetail,
    },
  ];

  return (
    <section className="mx-12 mb-12 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-5 py-3">
      {cells.map((cell) => (
        <div key={cell.label} className="group relative cursor-default">
          <div className="flex items-baseline gap-2 rounded-full border border-white/[0.05] px-3 py-1.5 transition-colors duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]">
            <span className="font-mono text-[10px] text-text-muted">{cell.label}</span>
            <span className="font-numeric text-[12px] text-text-primary">{cell.value}</span>
          </div>
          <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 min-w-[12rem] rounded-xl border border-white/[0.08] bg-bg-panel/95 px-3 py-2 text-[10px] text-text-secondary opacity-0 shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition-opacity duration-200 group-hover:opacity-100">
            {cell.detail}
          </div>
        </div>
      ))}
    </section>
  );
}
