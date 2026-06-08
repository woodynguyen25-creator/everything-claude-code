# Codex — Next Slice: Heimdall's Watch + two refinements

**Author:** Claude (lead designer)
**For:** Codex (engineer)
**Date:** 2026-05-25
**Prereq:** Parts 1–8 of the Agentic OS are shipped and accepted. Dashboard live at `127.0.0.1:3737`.

> Copy everything between the `=====` lines into a fresh Codex session.

=====

## Parts 1–8 accepted

Your Agentic OS build (Parts 1–8) is reviewed and accepted — REALM home, KPI strip, Token Burn Meter, Quick Actions, the cost-aware triad, auto-start assets, route audit, Obsidian setup doc. Good work. Three things you raised, answered:

**Your Q1 — Codex worker fallback hardening.** Yes, do a *small* hardening pass — it's folded into this slice as Refinement A below. The "pause before free-tier downgrade" behavior is correct and stays; the issue is the `codex exec` worker path itself being flaky/slow under the triad. Make it reliable. Not a blocker — the pause is a safe floor — but worth fixing now.

**Your Q2 — Token Burn denominators.** Surface them. See Refinement B below. Implicit magic numbers confuse; a hover tooltip fixes it.

**Your Q3 — /activity as the next slice.** Yes. That is this slice. Heimdall's Watch is the natural next surface now that the home and triad exist.

## Same working discipline

One thing at a time · `typecheck` + `build` after each · commit per item locally · no `git push` · keep `127.0.0.1:3737` live and viewable. Build all three items this session (the main slice + two refinements), then report.

---

## MAIN SLICE — Heimdall's Watch (`/activity`)

`/activity` is currently a stub. Make it the real **Heimdall's Watch** — the timeline of everything that has happened in the realm. Spec reference: `dashboard/docs/HEIMDALL-WATCH-SPEC.md` (read it first if it exists; this brief is authoritative where they differ).

### What it shows

A reverse-chronological **timeline** of realm events, aggregated from sources that already exist:

| Event kind | Source |
|---|---|
| Triad Forgings | `data/triad-usage.json` — each Forging: agent, mode, cost, stages, outcome |
| Quick Action runs | `/api/forge/[action]` history — log each invocation to a new `data/activity-log.json` (append-only) |
| Loop runs | `scripts/loops/*` outputs — morning brief, weekly wyrd, etc. (read their Obsidian output files or a log) |
| Doctor runs | `~/.claude/logs/aios-doctor/last-run.json` + savepoints |
| Dreaming Surfaces | `data/aios-stats.json` `dreams[]` — the self-improvement detections |
| Council sessions | the `/[agent]/[threadId]` chat threads — recent ones |

### Data layer
- `lib/activity.ts` (new) — `type ActivityEvent = { id, timestamp, kind, agent|null, title, detail?, cost?, source, href? }`. `listActivity(filter?)` aggregates all sources, returns newest-first, module-cache 30s.
- `data/activity-log.json` (new, append-only) — every `/api/forge/[action]` call appends `{ timestamp, action, agent, status }`. Wire this append into the existing forge route.
- `app/api/activity/route.ts` (new) — GET with query params `kind`, `agent`, `since`, `limit`.

### Page — `app/activity/page.tsx`
- Header: `HEIMDALL'S WATCH` (Cinzel ≥24px), subtitle italic — *"All that crossed the bridge."*
- Filter chips: by kind, by agent (agent-accent colored), by time window (today / 7d / all)
- Vertical timeline, newest at top, grouped by day then hour
- Each event row: timestamp pill (IBM Plex Mono), agent-accent badge, title, optional detail line, optional cost, optional drill-down link
- `panel` utility, asymmetric — the timeline column is wide, a thin "today's tally" rail on the right (N Forgings · $X DeepSeek spent · N loops run)
- Empty state from `content/norse-copy.json`: *"Heimdall sees only stillness. No events crossed the bridge today."*
- Auto-refresh every 30s

### Component — `components/ActivityTimeline.tsx` (client)
- Filter state, 30s poll, agent-accent color coding, reduced-motion safe
- Keyboard: `↑/↓` move selection, `Enter` opens drill-down

### Acceptance
- `/activity` returns 200, renders real aggregated events from all 6 sources
- Filters work (kind / agent / window)
- A new Quick Action run appears in the timeline within 30s
- `typecheck` + `build` clean

---

## REFINEMENT A — harden the Codex worker in the triad

In `scripts/triad/forge.js` + `scripts/loops/lib/router.js`:
- The `callCodex()` path (`codex exec`) was flaky/slow under the triad in your smoke test. Harden it:
  - Add an explicit timeout (e.g. 90s) to the `codex exec` subprocess — on timeout, treat Codex as unavailable and follow the existing fallback chain (DeepSeek if uncapped → else pause-and-ask).
  - Capture and log `codex exec` stderr to `data/triad-usage.json` so failures are diagnosable, not silent.
  - Confirm `codex exec` is invoked with a non-interactive flag set and a working directory — verify against `codex --help`.
- Keep the "pause before free-tier downgrade" behavior exactly as-is. This refinement makes Codex *succeed more often*, not change the fallback floor.
- Verify: force a Forging through the Codex worker path and confirm it completes (or times out cleanly into the fallback).

## REFINEMENT B — surface Token Burn denominators

In `components/TokenBurnMeter.tsx`:
- The Claude and Codex bars show `% of daily window` against a conservative token denominator. Make that denominator visible.
- Add a hover tooltip / small help affordance on each subscription bar: *"X% of an estimated N-token daily window. Subscription plans are flat-rate — this tracks usage rhythm, not spend."*
- DeepSeek bar already shows real dollars — give it a tooltip too: *"Real metered spend. $X.XX of your ~$5 balance."*
- Keep it subtle — a `?` or hover, not always-on clutter.

---

## Build order
1. Refinement B (smallest — Token Burn tooltips)
2. Refinement A (Codex worker hardening)
3. Main slice — Heimdall's Watch

`typecheck` + `build` after each. Commit per item.

## Hard rules (unchanged)
- Don't touch `lib/agent-status.ts`, `personas/*.md`, `content/norse-copy.json`.
- `render.js` — JSON output block only.
- No `git push`. No new npm packages unless unavoidable (flag if so).

## Report back
`dashboard/docs/codex-to-claude-review-heimdall-2026-05-25.md`: what shipped, checkpoints, the 6 activity sources verified wired, Codex-worker hardening test result, open questions.

Begin with Refinement B.

=====

## Notes for Woody (not part of the Codex prompt)

- This slice completes the dashboard's core surfaces: REALM (home) + Heimdall's Watch (activity) + the triad. After this, the Agentic OS is functionally whole.
- Refinement A makes the Codex worker reliable inside the triad — right now it sometimes falls back unnecessarily.
- The terminal-freeze fix is separate and already applied to your Obsidian config.
