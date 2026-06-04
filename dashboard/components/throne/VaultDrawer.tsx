"use client";

// ============================================================================
// VaultDrawer — the green-CRT "Interactive Context Vault" (androoagi Layer 2).
// Turns the Throne from cosmetic into a real observability surface:
//   TRACE — per-agent step-by-step execution waterfall (the #1 gap / data spine)
//   EVAL  — LLM-as-judge quality scores + pass/fail + regression sparkline
//   COST  — token + $ trend with running total and budget cap
// Demo-fed today (deterministic per agent); structured to bind real
// JSONL/Droplet events when wired into the dashboard.
// ============================================================================

import { useMemo, useState } from "react";

type AgentLike = { id: string; name: string; emoji: string; color: string };
type Props = {
  agent: AgentLike;
  behavior: string;
  currentTask?: string;
  realTrace?: TraceStep[];
  realCost?: { tokens: number; usd: number };
  onClose: () => void;
  onOpenChat: () => void;
};

type StepKind = "decision" | "llm" | "tool" | "retrieval";
interface TraceStep {
  kind: StepKind;
  label: string;
  ms: number;
  tokens: number;
  depth: number;
  status: "ok" | "warn" | "err";
}

// ---- deterministic pseudo-random so each agent is stable across renders ----
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STEP_LIB: Record<string, Array<[StepKind, string]>> = {
  working: [["decision", "plan approach"], ["llm", "draft patch"], ["tool", "edit_file"], ["tool", "run_tests"], ["llm", "summarize result"]],
  debugging: [["decision", "form hypothesis"], ["tool", "read_logs"], ["retrieval", "search codebase"], ["llm", "locate root cause"], ["tool", "apply_fix"], ["tool", "rerun"]],
  researching: [["decision", "scope query"], ["retrieval", "web_search"], ["retrieval", "fetch sources"], ["llm", "synthesize"], ["llm", "cite + rank"]],
  thinking: [["decision", "decompose task"], ["llm", "reason step 1"], ["llm", "reason step 2"], ["decision", "choose path"]],
  meeting: [["retrieval", "load context"], ["llm", "draft proposal"], ["decision", "align with peers"]],
  deploying: [["decision", "preflight"], ["tool", "build"], ["tool", "deploy"], ["tool", "healthcheck"]],
  reporting: [["retrieval", "gather metrics"], ["llm", "write brief"], ["tool", "post_update"]],
  default: [["decision", "assess"], ["llm", "respond"], ["tool", "act"]],
};

function buildTrace(agentId: string, behavior: string): TraceStep[] {
  const rng = mulberry(seedOf(agentId + behavior));
  const tmpl = STEP_LIB[behavior] ?? STEP_LIB.default;
  return tmpl.map(([kind, label], i): TraceStep => {
    const r = rng();
    return {
      kind,
      label,
      ms: Math.round(80 + r * (kind === "llm" ? 2600 : kind === "tool" ? 1400 : 300)),
      tokens: kind === "llm" ? Math.round(180 + r * 1400) : kind === "retrieval" ? Math.round(40 + r * 300) : 0,
      depth: kind === "tool" || kind === "retrieval" ? 1 : 0,
      status: r > 0.92 ? "err" : r > 0.78 ? "warn" : "ok",
    };
  });
}

const KIND_COLOR: Record<StepKind, string> = {
  decision: "#a855f7",
  llm: "#22d3ee",
  tool: "#f59e0b",
  retrieval: "#22c55e",
};
const STATUS_DOT: Record<TraceStep["status"], string> = { ok: "#22c55e", warn: "#f59e0b", err: "#ef4444" };

function buildEval(agentId: string) {
  const rng = mulberry(seedOf(agentId + "eval"));
  const correctness = Math.round(72 + rng() * 26);
  const reasoning = Math.round(70 + rng() * 28);
  const safety = Math.round(88 + rng() * 11);
  const history = Array.from({ length: 8 }, () => Math.round(60 + rng() * 38));
  return { correctness, reasoning, safety, history, overall: Math.round((correctness + reasoning + safety) / 3) };
}

function buildCost(agentId: string) {
  const rng = mulberry(seedOf(agentId + "cost"));
  const trend = Array.from({ length: 12 }, () => Math.round(200 + rng() * 1800));
  const tokens = trend.reduce((a, b) => a + b, 0);
  const usd = tokens * 0.000003;
  const budget = 0.25;
  return { trend, tokens, usd, budget, pct: Math.min(100, Math.round((usd / budget) * 100)) };
}

type Tab = "trace" | "eval" | "cost";

export default function VaultDrawer({ agent, behavior, currentTask, realTrace, realCost, onClose, onOpenChat }: Props) {
  const [tab, setTab] = useState<Tab>("trace");
  const trace = useMemo(
    () => (realTrace && realTrace.length ? realTrace : buildTrace(agent.id, behavior)),
    [agent.id, behavior, realTrace],
  );
  const evalData = useMemo(() => buildEval(agent.id), [agent.id]);
  const cost = useMemo(() => {
    const base = buildCost(agent.id);
    if (!realCost) return base;
    const budget = Math.max(0.25, realCost.usd * 1.25);
    return { ...base, tokens: realCost.tokens, usd: realCost.usd, budget, pct: Math.min(100, Math.round((realCost.usd / budget) * 100)) };
  }, [agent.id, realCost]);
  const maxMs = Math.max(...trace.map((s) => s.ms), 1);
  const maxCost = Math.max(...cost.trend, 1);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside
        className="relative h-full w-full max-w-md overflow-y-auto border-l border-emerald-500/30 bg-[#040a06] p-5 font-mono text-emerald-300 shadow-[0_0_60px_rgba(16,185,129,0.18)]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(16,185,129,0.04) 0px, rgba(16,185,129,0.04) 1px, transparent 1px, transparent 3px)" }}
      >
        {/* header */}
        <div className="flex items-start justify-between border-b border-emerald-500/20 pb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-500/60">{"// interactive context vault"}</div>
            <div className="mt-1 flex items-center gap-2 text-lg text-emerald-200">
              <span style={{ color: agent.color }}>{agent.emoji}</span> {agent.name.toUpperCase()}
            </div>
            <div className="text-[11px] text-emerald-400/70">state: {behavior}{typeof currentTask === "string" && currentTask ? ` · ${currentTask}` : ""}</div>
          </div>
          <button type="button" onClick={onClose} className="text-emerald-500/60 hover:text-emerald-200" aria-label="Close">✕</button>
        </div>

        {/* tabs */}
        <div className="mt-3 flex gap-1 text-[10px] uppercase tracking-wider">
          {(["trace", "eval", "cost"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded border px-2.5 py-1 ${tab === t ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200" : "border-emerald-500/20 text-emerald-500/50 hover:text-emerald-300"}`}
            >
              {t === "trace" ? "▸ trace" : t === "eval" ? "▸ eval" : "▸ cost"}
            </button>
          ))}
        </div>

        {/* TRACE */}
        {tab === "trace" && (
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[10px] text-emerald-500/50">
              <span>EXECUTION WATERFALL · {trace.length} STEPS</span>
              <span>{trace.reduce((a, s) => a + s.ms, 0)}ms · {trace.reduce((a, s) => a + s.tokens, 0)} tok</span>
            </div>
            <ul className="space-y-1.5">
              {trace.map((s, i) => (
                <li key={i} className="text-[11px]" style={{ paddingLeft: s.depth * 14 }}>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_DOT[s.status] }} />
                    <span className="shrink-0 uppercase" style={{ color: KIND_COLOR[s.kind] }}>{s.kind}</span>
                    <span className="truncate text-emerald-300/90">{s.label}</span>
                    <span className="ml-auto shrink-0 text-emerald-500/50">{s.ms}ms{s.tokens ? ` · ${s.tokens}t` : ""}</span>
                  </div>
                  <div className="mt-0.5 h-1 rounded-sm bg-emerald-500/10">
                    <div className="h-full rounded-sm" style={{ width: `${Math.max(4, (s.ms / maxMs) * 100)}%`, background: KIND_COLOR[s.kind], opacity: 0.7 }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* EVAL */}
        {tab === "eval" && (
          <section className="mt-4 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] text-emerald-500/50">OVERALL QUALITY</div>
                <div className="text-3xl text-emerald-200">{evalData.overall}<span className="text-sm text-emerald-500/50">/100</span></div>
              </div>
              <span className={`rounded border px-2 py-0.5 text-[11px] ${evalData.overall >= 75 ? "border-emerald-400/50 text-emerald-300" : "border-amber-400/50 text-amber-300"}`}>
                {evalData.overall >= 75 ? "PASS" : "REVIEW"} · threshold 75
              </span>
            </div>
            {[["correctness", evalData.correctness], ["reasoning", evalData.reasoning], ["safety", evalData.safety]].map(([k, v]) => (
              <div key={k as string}>
                <div className="flex justify-between text-[10px] uppercase text-emerald-500/60"><span>{k as string}</span><span>{v as number}</span></div>
                <div className="mt-1 h-1.5 rounded bg-emerald-500/10"><div className="h-full rounded bg-emerald-400/70" style={{ width: `${v as number}%` }} /></div>
              </div>
            ))}
            <div>
              <div className="mb-1 text-[10px] uppercase text-emerald-500/50">last 8 runs (LLM-as-judge)</div>
              <div className="flex items-end gap-1 h-12">
                {evalData.history.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-emerald-400/40" style={{ height: `${h}%` }} title={`${h}`} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* COST */}
        {tab === "cost" && (
          <section className="mt-4 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] text-emerald-500/50">SESSION COST</div>
                <div className="text-3xl text-emerald-200">${cost.usd.toFixed(3)}</div>
                <div className="text-[11px] text-emerald-500/60">{cost.tokens.toLocaleString()} tokens</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-emerald-500/50">BUDGET ${cost.budget.toFixed(2)}</div>
                <div className={`text-lg ${cost.pct > 85 ? "text-amber-300" : "text-emerald-200"}`}>{cost.pct}%</div>
              </div>
            </div>
            <div className="h-1.5 rounded bg-emerald-500/10"><div className={`h-full rounded ${cost.pct > 85 ? "bg-amber-400/80" : "bg-emerald-400/70"}`} style={{ width: `${cost.pct}%` }} /></div>
            <div>
              <div className="mb-1 text-[10px] uppercase text-emerald-500/50">tokens / interval (last 12)</div>
              <div className="flex items-end gap-1 h-16">
                {cost.trend.map((t, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-cyan-400/40" style={{ height: `${Math.max(6, (t / maxCost) * 100)}%` }} title={`${t} tok`} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* actions */}
        <div className="mt-6 flex gap-2 border-t border-emerald-500/20 pt-4">
          <button type="button" onClick={onOpenChat} className="rounded border border-emerald-500/40 px-3 py-1.5 text-[11px] text-emerald-200 hover:bg-emerald-500/10">open chat →</button>
        </div>
      </aside>
    </div>
  );
}
