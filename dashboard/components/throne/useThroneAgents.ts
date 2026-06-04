"use client";

// ============================================================================
// useThroneAgents — HYBRID data spine for the Throne hall.
//   • Fixed named residents (always present, ambient behavior cycling)
//   • Live session sprites from ~/.claude/projects/**/*.jsonl via /api/throne
//     (real step-traces, token cost, derived behavior)
// Returns one shape the hall + Vault consume; residents fall back to synth
// Vault data, sessions carry real traces/cost.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import type { AgentConfig, AgentBehavior, AgentDashboardState } from "@/throne-engine/types";

export type ThroneStep = {
  kind: "decision" | "llm" | "tool" | "retrieval";
  label: string;
  ms: number;
  tokens: number;
  depth: number;
  status: "ok" | "warn" | "err";
};

interface ApiSession {
  id: string;
  label: string;
  project: string;
  ageMin: number;
  active: boolean;
  behavior: string;
  steps: ThroneStep[];
  tokens: number;
  usd: number;
}

export interface ThroneData {
  agents: AgentConfig[];
  agentStates: Record<string, AgentDashboardState>;
  traces: Record<string, ThroneStep[]>;
  costs: Record<string, { tokens: number; usd: number }>;
  labels: Record<string, string>;
  connected: boolean;
  demoMode: boolean;
}

const RESIDENTS: AgentConfig[] = [
  { id: "lebot", name: "LeBot James", emoji: "👑", color: "#f4c430", avatar: "suit" },
  { id: "thor", name: "Thor", emoji: "⚡", color: "#4fc3f7", avatar: "hoodie" },
  { id: "perseus", name: "Perseus", emoji: "🛡️", color: "#22c55e", avatar: "glasses" },
  { id: "fenrir", name: "Fenrir", emoji: "🐺", color: "#a855f7", avatar: "robot" },
  { id: "sauron", name: "Sauron", emoji: "👁️", color: "#ef4444", avatar: "casual" },
];

const CYCLE: AgentBehavior[] = [
  "working", "thinking", "researching", "meeting", "debugging", "reporting", "deploying", "idle", "coffee",
];
const VALID = new Set<string>([...CYCLE, "snacking", "sleeping", "receiving_task"]);
const SESSION_PALETTE = ["#38bdf8", "#f472b6", "#facc15", "#34d399", "#c084fc", "#fb923c"];
const SESSION_AVATARS = ["glasses", "hoodie", "robot", "casual", "cat", "dog"] as const;
const MAX_SESSION_AGENTS = 3;

function makeState(behavior: AgentBehavior): AgentDashboardState {
  return {
    behavior,
    officeState: "idle",
    currentTask: null,
    taskHistory: [],
    tokenUsage: [],
    totalTokens: 0,
    totalTasks: 0,
    lastActivity: Date.now(),
    sessionLog: [],
    uptime: 0,
  };
}

function behaviorOf(s: string): AgentBehavior {
  return (VALID.has(s) ? s : "working") as AgentBehavior;
}

function emojiFor(b: string): string {
  if (b === "researching") return "🔎";
  if (b === "thinking") return "💭";
  if (b === "idle") return "😴";
  if (b === "debugging") return "🪲";
  return "⚙️";
}

export function useThroneAgents(): ThroneData {
  const [residentStates, setResidentStates] = useState<Record<string, AgentDashboardState>>(() =>
    Object.fromEntries(RESIDENTS.map((a, i) => [a.id, makeState(CYCLE[i % CYCLE.length])])),
  );
  const [sessions, setSessions] = useState<ApiSession[]>([]);

  // Ambient resident behavior cycling.
  useEffect(() => {
    const t = window.setInterval(() => {
      setResidentStates((prev) => {
        const pick = RESIDENTS[Math.floor(Math.random() * RESIDENTS.length)];
        return { ...prev, [pick.id]: makeState(CYCLE[Math.floor(Math.random() * CYCLE.length)]) };
      });
    }, 2500);
    return () => window.clearInterval(t);
  }, []);

  // Live Claude Code sessions.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/throne", { cache: "no-store" });
        const j = await r.json();
        if (alive && Array.isArray(j?.sessions)) setSessions(j.sessions.slice(0, MAX_SESSION_AGENTS));
      } catch {
        /* keep last known */
      }
    };
    load();
    const t = window.setInterval(load, 5000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  return useMemo<ThroneData>(() => {
    const sessionAgents: AgentConfig[] = sessions.map((s, i) => ({
      id: `sess-${s.id}`,
      name: (s.label || "session").slice(0, 16),
      emoji: emojiFor(s.behavior),
      color: SESSION_PALETTE[i % SESSION_PALETTE.length],
      avatar: SESSION_AVATARS[i % SESSION_AVATARS.length],
    }));

    const agentStates: Record<string, AgentDashboardState> = { ...residentStates };
    const traces: Record<string, ThroneStep[]> = {};
    const costs: Record<string, { tokens: number; usd: number }> = {};
    const labels: Record<string, string> = {};

    sessions.forEach((s) => {
      const id = `sess-${s.id}`;
      agentStates[id] = makeState(behaviorOf(s.behavior));
      traces[id] = s.steps;
      costs[id] = { tokens: s.tokens, usd: s.usd };
      labels[id] = s.label;
    });

    return {
      agents: [...RESIDENTS, ...sessionAgents],
      agentStates,
      traces,
      costs,
      labels,
      connected: sessions.some((s) => s.active),
      demoMode: sessions.length === 0,
    };
  }, [residentStates, sessions]);
}
