"use client";

// ============================================================================
// IsometricHall — the Throne, ported from the androoagi-style isometric office.
// Neon room-grid hall + HUD (day/clock/speed/events/agents) + REPLAY timeline +
// guardrails/alerts strip + per-agent Context Vault. Fed by useThroneAgents.
// ============================================================================

import { useEffect, useState } from "react";
import type { OwnerConfig } from "@/throne-engine/types";
import { useOffice } from "@/throne-engine/useOffice";
import { useThroneAgents } from "./useThroneAgents";
import OfficeCanvasInner from "./OfficeCanvas";
import VaultDrawer from "./VaultDrawer";

const IDLE_BEHAVIORS = new Set(["idle", "sleeping", "coffee", "snacking"]);
const SPEEDS = [1, 2, 5, 10];
const OWNER: OwnerConfig = { name: "Operator", emoji: "♛", avatar: "boss" };

export default function IsometricHall() {
  const { agents, agentStates, traces, costs, labels, connected, demoMode } = useThroneAgents();
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [clock, setClock] = useState("");
  const [vaultAgent, setVaultAgent] = useState<string | null>(null);

  const { officeState, tick } = useOffice(agents, agentStates, speed);

  useEffect(() => {
    const fmt = () =>
      setClock(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    fmt();
    const t = window.setInterval(fmt, 15000);
    return () => window.clearInterval(t);
  }, []);

  const openVault = vaultAgent ? agents.find((a) => a.id === vaultAgent) ?? null : null;
  const activeCount = agents.filter((a) => !IDLE_BEHAVIORS.has(agentStates[a.id]?.behavior ?? "idle")).length;
  const warnCount = agents.filter((a) => agentStates[a.id]?.behavior === "debugging").length;
  const costPct = Math.round(8 + ((officeState.tick % 360) / 360) * 70);
  const dayNum = new Date().getDate();

  return (
    <div className="min-h-screen bg-[#05050b] text-cyan-100" data-theme="cyberpunk">
      {/* HUD */}
      <div className="border-b border-cyan-400/20 bg-[#06060d]/90 font-mono text-[11px] text-cyan-100/80 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 pt-2">
          <span className="tracking-[0.25em] text-cyan-300">⬡ THE THRONE</span>
          <span className="text-cyan-100/50">DAY {dayNum} — {clock}</span>
          <div className="flex items-center gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded px-1.5 py-0.5 text-[10px] transition ${speed === s ? "bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/50" : "text-cyan-100/40 hover:text-cyan-100/70"}`}
              >
                {s}x
              </button>
            ))}
          </div>
          <span className="text-cyan-100/50">EVENTS <span className="text-cyan-200">{officeState.tick}</span></span>
          <span className="text-cyan-100/60">
            AGENTS <span className="text-emerald-400">{activeCount}</span>/<span className="text-cyan-100">{agents.length}</span> ACTIVE
          </span>
          <span className={connected ? "text-emerald-400" : "text-amber-400/80"}>
            {connected ? "● LIVE" : demoMode ? "● DEMO" : "● OFFLINE"}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {agents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setVaultAgent(a.id)}
                title={`Open vault — ${a.name}`}
                className="flex items-center gap-1 rounded border border-cyan-400/20 px-1.5 py-0.5 text-[10px] text-cyan-100/70 transition hover:border-cyan-400/50 hover:text-cyan-100"
              >
                <span style={{ color: a.color }}>{a.emoji}</span>
                {a.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-2 pt-1.5 text-[10px]">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded border border-cyan-400/30 px-1.5 py-0.5 text-cyan-200 hover:bg-cyan-400/10"
            aria-label={paused ? "Play" : "Pause"}
          >
            {paused ? "▶" : "⏸"}
          </button>
          <span className="text-cyan-100/40">REPLAY</span>
          <div className="relative h-1 w-48 max-w-[40vw] rounded bg-cyan-400/10">
            <div className="absolute left-0 top-0 h-full rounded bg-cyan-400/60" style={{ width: `${Math.round(officeState.dayNightPhase * 100)}%` }} />
          </div>
          <span className="text-cyan-100/30">{paused ? "paused" : "live"}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-emerald-400/80">GUARDRAILS ✓</span>
            <span className="text-cyan-100/50">ERRORS <span className="text-emerald-400">0</span></span>
            <span className="text-cyan-100/50">WARN <span className={warnCount ? "text-amber-300" : "text-emerald-400"}>{warnCount}</span></span>
            <span className="text-cyan-100/50">COST <span className={costPct > 85 ? "text-amber-300" : "text-cyan-200"}>{costPct}%</span></span>
          </div>
        </div>
      </div>

      {/* Hall */}
      <div className="relative flex items-center justify-center overflow-auto py-6">
        <OfficeCanvasInner
          officeState={officeState}
          agents={agents}
          owner={OWNER}
          onTick={tick}
          width={1100}
          height={620}
          connected={connected}
          demoMode={demoMode}
          paused={paused}
        />
      </div>

      {openVault && (
        <VaultDrawer
          agent={openVault}
          behavior={agentStates[openVault.id]?.behavior ?? "idle"}
          currentTask={labels[openVault.id]}
          realTrace={traces[openVault.id]}
          realCost={costs[openVault.id]}
          onClose={() => setVaultAgent(null)}
          onOpenChat={() => setVaultAgent(null)}
        />
      )}
    </div>
  );
}
