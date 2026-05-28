# Codex — Refinement Pass 2: God Mode (Triad-per-Agent) + Dev-Server Auto-Start

**Author:** Claude (lead designer)
**For:** Codex (engineer)
**Date:** 2026-05-25
**Context:** Run this **after** `PASTE-INTO-CODEX-REFINE.md` finishes. It **supersedes Item 14** of that brief. Item 14 said "Supercharge = swap to Opus." Woody wants something bigger: Supercharge = **activate the triad/quad pipeline for that agent.** This brief specs that, plus reliable dev-server auto-start.

> Copy everything between the `=====` lines into a fresh Codex session.

=====

## Background — two systems that aren't connected

The dashboard has a multi-model **triad/quad pipeline** — `scripts/triad/forge.js` — with a cost-aware Thinker that routes work across Opus, DeepSeek, Codex, and free models, with critique loops. **Today it only powers the home-page Quick Actions** (morning-brief, deep-research, plan-today…).

The **per-agent Council chat** (`/lebot-james`, `/thor`, …) is a *separate* system: `app/api/chat/[agent]/route.ts` → `streamCouncilResponse` → **one single model** per agent (`lib/council.ts` `primaryModel`).

Woody's intent: a Council question should normally get a fast, cheap single-model answer — but he can **activate that agent's "God Mode,"** which routes the *same question* through the triad/quad: deep multi-model thinking with critique. This brief connects the two systems.

## ITEM A — Council "God Mode" (triad/quad activation per agent)

Replace the Item-14 "Supercharge = Opus" toggle with **God Mode**.

### Behavior

- **Normal (toggle OFF):** Council chat works exactly as it does now — the agent's single Normal model answers fast and cheap. (Normal models per `lib/council.ts`: Lebot/Thor/Fenrir = Claude Sonnet, Perseus = DeepSeek, Sauron = Gemini Flash free.)
- **God Mode (toggle ON):** the question routes through the **triad pipeline** instead of a single model:
  1. **Interrogator** — runs **first, always**. Before any thinking, it heavily questions Woody — as many clarifying questions as the task warrants, no cap (this matches Woody's standing "question me on everything" rule). It streams the questions into the chat as the agent's message and **pauses for his answers**. See "Interrogator turn" below.
  2. **Thinker — Opus** — once Woody answers, the Thinker reads the question + answers, breaks the work into pieces, and assigns each piece the optimal model by **capability + cost** (the cost-aware Thinker — see `project_aios_triad`: protect budget, never blind-route). **The Thinker is always Opus** — it is the deepest reasoner and this role is fixed.
  3. **Worker(s)** — DeepSeek / Codex / free models execute the pieces per the Thinker's plan.
  4. **Critic loop** — the Thinker decides whether to escalate to **quad**: up to **3 critique passes** (hard cap), different-family critic models each pass. Standard triad = one review; quad = the full loop. The escalation decision is shown in the streamed plan.
  5. **Synthesis** — the final answer is delivered **in the agent's persona voice** (Thor sounds like Thor), streamed back into the same chat thread.
- God Mode defaults **OFF on every new thread** — it is opt-in per summon, never sticky, so the heavy pipeline never runs by accident.

### Interrogator turn (God Mode is a two-step interaction)

God Mode is interactive, not fire-and-forget:

1. Woody sends his prompt with God Mode ON → the **Interrogator** streams clarifying questions back as the agent's message, then the composer enters an "answer the questions" state (reuse the existing Quick-Action `answers` pattern — `api/forge` already has an `answers` field for exactly this).
2. Woody answers in the next message.
3. *Then* the Thinker → Worker → Critic pipeline runs to completion.

Heavy questioning is the point — the Interrogator should ask freely, not minimize. If Woody's first prompt is already fully specified, the Interrogator may still confirm 2–3 key assumptions before proceeding.

### The toggle UI

In the council composer, next to SUMMON, a labeled activation switch with a **per-agent themed name** (locked — use exactly these):

| Agent | God Mode label |
|---|---|
| Lebot James | **All-Father Mode** |
| Thor | **Thunder God Mode** |
| Perseus | **Oracle Mode** |
| Fenrir | **Fenrir Unchained** |
| Sauron | **The Eye Opens** |

When ON: the switch glows the agent's accent color, the cost estimate beside SUMMON rises to reflect the pipeline, and the "via…" line shows the pipeline (`via triad — Opus · DeepSeek · Groq-critic`) instead of a single model.

### Show the work

Per the triad design, the pipeline's **execution plan must be visible** — stream pipeline progress into the chat as it runs:
`⚡ Thinker (Opus) is planning…` → `Plan: piece 1 → Codex, piece 2 → DeepSeek — here's why` → `Worker (DeepSeek) drafting…` → `Critic pass 1/3…` → final answer. Reuse the existing `ToolCallCard` / streaming-event styling so it feels native to the chat.

### Implementation notes

- Add a generic freeform entry point to the triad — `forge.js` currently keys off a fixed `ACTION_CONFIG`. Add a `council-deep` action (or a `runCouncilTriad(agent, prompt, mode)` export) that accepts an arbitrary agent + prompt and runs thinker → worker → critic. Reuse `scripts/loops/lib/router.js` (`route`, `MODEL_MAP`, `callDeepSeek`, `callCodex`, …) — do not re-implement model calls.
- `app/api/chat/[agent]/route.ts`: when the request carries `godMode: true`, route through the triad path instead of `streamCouncilResponse`'s single-model path. Stream the same SSE event shape so the existing `ChatStream` renders it.
- **Pipeline shape:** Interrogator → Thinker (always **Opus**) → Worker(s) → review. Default is the **triad** (one review). The **Thinker decides** whether to escalate to **quad** (the 3-pass critique loop) based on task difficulty — escalation decision shown in the streamed plan. Do not hardcode quad-always; the Thinker owns that call.
- **Budget safety:** respect the existing DeepSeek caps — soft warn $0.50/day, hard stop $1.50/day; when capped, the worker role reroutes to Codex (flat cost). The Interrogator/Thinker accounts for this automatically. None of this is new — wire God Mode into the *existing* triad-usage + cap logic (`lib/triad-usage.ts`, `forge.js`).
- Keep the `lib/council-models.ts` config object as the single source for each agent's Normal model + God Mode label. One-line editable.

## ITEM B — Dev-server auto-start (so the embedded frame is never blank)

The dashboard is embedded in Obsidian via a Custom Frame pointing at `http://127.0.0.1:3737`. If the Next.js dev server isn't running, the frame is blank. Make the server reliably available.

- Provide a **reliable auto-start**: a small launcher (a `.cmd`/`.ps1` in `dashboard/` or a Windows Task Scheduler entry — your call) that starts `npm run dev` on login, bound to `127.0.0.1:3737`, idempotent (does nothing if the port is already serving).
- It must **survive**: if the process dies, it should be restartable trivially. A documented one-command restart is the minimum; a keep-alive wrapper is better.
- Document the chosen mechanism in the report. Do not add a new npm dependency for this — use OS-native scheduling or a plain Node/PowerShell script.
- If `PASTE-INTO-CODEX-AGENTIC-OS.md` Part 6 already added an auto-start, **audit it** — the dev server has died repeatedly in practice. Make it actually reliable.

## Working discipline

`typecheck` + `build` after each item. One commit per item. No `git push`. Keep `127.0.0.1:3737` live.

## Report back

Append to `dashboard/docs/codex-to-claude-review-refine-2026-05-25.md`: how God Mode wires the chat route into the triad, the freeform triad entry point you added, how pipeline progress is streamed, the auto-start mechanism chosen, and anything you left + why.

Begin with Item A.

=====

## Notes for Woody (not part of the Codex prompt)

- **Where the triad went:** it was built — `dashboard/scripts/triad/forge.js` — but it was only ever wired to the home-page Quick Actions, never to the agent chat. This brief connects them so "God Mode" on any agent = the triad/quad on your question.
- The `lib/council.ts` file even still has a leftover `chain` field (`planner`/`critic`/`bulkExecutor`) — that was the *original* idea where each agent was one fixed stage of the triad. Your new model is better: any agent can individually go full-pipeline.
- God Mode names are placeholders — "Thunder God Mode" is yours; tell me what you want for the other four.
- The `/usage` auto-capture hook is spec'd separately in `dashboard/docs/USAGE-CAPTURE-HOOK-SPEC.md`.
