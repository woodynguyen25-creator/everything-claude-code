// One canonical DEPARTMENT model that both halves of Operations map into.
//
//   • Council "workers" (named agents + bots) live in COUNCIL_DOMAINS — identity + control.
//   • Live "sessions" (Claude Code windows) arrive as heartbeats carrying a coarse `group`.
//
// Sessions and Council are different LAYERS that look alike (both render as status cards):
// one is runtime telemetry, the other is a curated roster with controls. Operations puts
// them under one roof, organized by the department each belongs to. This module is the
// bridge — Council's domains are canonical; sessions are aliased into them.

import {
  COUNCIL_DOMAINS,
  type CouncilDomain,
  type CouncilDomainKey,
  type CouncilAccent,
} from './council-roster';

export type DepartmentKey = CouncilDomainKey | 'unassigned';

export type Department = {
  key: DepartmentKey;
  label: string;
  tagline: string;
  accent: CouncilAccent;
};

// Canonical departments = Council's domains (single source of truth, DRY) plus an
// Unassigned catch-all so an unmapped heartbeat can always land somewhere visible.
export const DEPARTMENTS: Department[] = [
  ...COUNCIL_DOMAINS.map(
    (d): Department => ({ key: d.key, label: d.label, tagline: d.tagline, accent: d.accent }),
  ),
  {
    key: 'unassigned',
    label: 'UNASSIGNED',
    tagline: 'Live sessions not yet mapped to a department',
    accent: 'iron',
  },
];

// Coarse heartbeat groups (set by aios-ceo.ps1 / session-map.json) → canonical department.
const GROUP_TO_DEPARTMENT: Record<string, DepartmentKey> = {
  FINANCIAL: 'trading',
  COGNITIVE: 'research',
  ARENA: 'code',
  UTILITY: 'command',
};

// Specific session-name overrides win over the coarse group. Order matters — the first
// match wins, so narrow rules (the hub, odysseus) sit above broad ones (anything olympus).
const SESSION_NAME_RULES: Array<{ match: RegExp; dept: DepartmentKey }> = [
  { match: /olympus-hub|^hub$/i, dept: 'command' },
  { match: /odysseus|brain[-_]?dump/i, dept: 'research' },
  { match: /lucky.?dog|fenrir/i, dept: 'lucky-dog' },
  { match: /parlay|polymarket|\bdfs\b/i, dept: 'code' },
  { match: /olympus|hermes|thor|trading|tradingview/i, dept: 'trading' },
  { match: /sauron|research|exa|scout/i, dept: 'research' },
  { match: /whisper|dictate|scripts?|everything.?claude|\becc\b/i, dept: 'command' },
];

/** Map a live session (by name first, then its coarse group) to a canonical department. */
export function departmentForSession(session: string, group: string): DepartmentKey {
  for (const rule of SESSION_NAME_RULES) {
    if (rule.match.test(session)) return rule.dept;
  }
  const byGroup = GROUP_TO_DEPARTMENT[(group ?? '').toUpperCase()];
  return byGroup ?? 'unassigned';
}

const FALLBACK_DEPARTMENT = DEPARTMENTS[DEPARTMENTS.length - 1];

export function departmentMeta(key: DepartmentKey): Department {
  return DEPARTMENTS.find((d) => d.key === key) ?? FALLBACK_DEPARTMENT;
}

/** The Council domain (workers) for a department, when one exists ('unassigned' has none). */
export function councilDomain(key: DepartmentKey): CouncilDomain | undefined {
  return COUNCIL_DOMAINS.find((d) => d.key === key);
}
