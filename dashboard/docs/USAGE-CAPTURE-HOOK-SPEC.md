# Spec — `/usage` Auto-Capture Hook

**Author:** Claude
**Date:** 2026-05-25
**Status:** Spec — follow-up, build after the dashboard refinement lands
**Goal:** Make the dashboard's Plan Usage meter (Token Burn, REFINE brief Item 3) show **real** usage — "how much before I hit my limit" — instead of an estimate.

---

## The problem

`/usage` shows true limit percentages, but it is an **interactive TUI command** — it cannot be reliably scraped or run headlessly. We need the same data on a schedule, written somewhere the dashboard can read.

## The approach

Don't scrape `/usage`. **Compute the same underlying numbers continuously** from the session transcripts — the exact source `/usage` and `render.js` already use — and write a `usage.json` the dashboard reads. Then **calibrate once against `/usage`** so the percentages match reality.

```
session transcripts (~/.claude/projects/**/*.jsonl)
        │  hook-triggered script (scan + window math)
        ▼
~/.claude/scripts/aios-dashboard/usage.json
        │  copied/symlinked into dashboard/data/usage.json
        ▼
TokenBurnMeter.tsx  →  "73% of 5h window · resets in 1h 40m"
```

## Step 1 — the compute script

A Node script (`~/.claude/scripts/aios-dashboard/usage-window.js`, sibling of `render.js`) that:

1. Scans all `~/.claude/projects/**/*.jsonl` transcripts.
2. For every assistant message, reads the `usage` object (`input_tokens`, `output_tokens`, `cache_*`) and the message timestamp + model.
3. Computes two rolling windows:
   - **5-hour window** — tokens from messages in the last 5h. Reset time = first message timestamp in the window + 5h.
   - **Weekly window** — tokens from the last 7 days. If the Opus weekly cap is tracked separately, compute an Opus-only weekly total too.
4. **Weights by model** — Opus burns the plan faster than Sonnet. Apply a weight (`OPUS_WEIGHT ≈ 5`, `SONNET_WEIGHT = 1`), exposed as named constants. **Exclude `cache_read`/`cache_write`** from the limit figure.
5. Writes `usage.json` (schema below).

> If a Claude Code usage/stats data file is discovered under `~/.claude/`, prefer reading it directly over transcript math. Until then, transcripts are the source of truth.

## Step 2 — the hook

Trigger the script so `usage.json` stays fresh:

- **`SessionStart` hook** — refresh when Claude Code opens.
- **`Stop` hook** — refresh at the end of each response/session (the active cadence).
- Both call `node ~/.claude/scripts/aios-dashboard/usage-window.js`. Mark async, ≤30s timeout, always `exit 0` (never block).
- Optional belt-and-braces: a Task Scheduler entry every 30 min so the meter is fresh even when Claude Code is idle.

## Step 3 — calibration (the accuracy step)

The true ceiling is not published. Calibrate it:

1. Woody runs `/usage` in Claude Code, notes the real percentage (e.g. "5h window: 45%").
2. He runs one command — `node usage-window.js --calibrate-5h 45` (or `--calibrate-week N`).
3. The script back-solves: `trueCeiling = countedWeightedTokens / 0.45`, stores it in `usage.json` as `calibrated.fiveHourCeiling`.
4. From then on the meter divides by the calibrated ceiling. Repeat 2–3× over different load levels → the meter converges on accurate.

Until first calibration, the meter uses `FIVE_HOUR_LIMIT_EST` / `WEEKLY_LIMIT_EST` defaults and labels itself "estimate".

## `usage.json` schema

```json
{
  "generatedAt": "2026-05-25T18:04:00-05:00",
  "fiveHour": {
    "weightedTokens": 184320,
    "ceiling": 250000,
    "ceilingSource": "calibrated",
    "percent": 73.7,
    "resetsAt": "2026-05-25T19:44:00-05:00"
  },
  "weekly": {
    "weightedTokens": 1340000,
    "ceiling": 3000000,
    "ceilingSource": "estimate",
    "percent": 44.7,
    "resetsAt": "2026-05-27T00:00:00-05:00"
  },
  "weeklyOpus": { "weightedTokens": 410000, "ceiling": 900000, "percent": 45.6, "resetsAt": "..." },
  "calibrated": { "fiveHourCeiling": 250000, "weeklyCeiling": null },
  "weights": { "opus": 5, "sonnet": 1 },
  "excludesCacheTokens": true
}
```

## Step 4 — dashboard consumption

`TokenBurnMeter.tsx` (already being reworked in REFINE Item 3) reads `dashboard/data/usage.json` and renders the two stacked bars directly from it — `percent` is the bar, `resetsAt` drives the countdown, `ceilingSource` decides whether to show an "estimate" tag. No math in the component.

## Ownership

- **Claude builds** Steps 1–3 (the script + hooks live in `~/.claude/` — Claude's domain).
- **Codex builds** Step 4 (it is part of REFINE Item 3 — make the meter read `usage.json`).
- Wire-up: `usage.json` is written under `~/.claude/scripts/aios-dashboard/` and copied (or symlinked) to `dashboard/data/usage.json`, the same way `render.js` output already reaches the dashboard.

## Limits reference (what we're measuring against)

Claude Max has a **5-hour rolling session window** and a **weekly limit**, with a separate, stricter **weekly Opus cap**. Opus consumes both far faster than Sonnet — hence the model weighting. Exact ceilings are not published by Anthropic; calibration (Step 3) is how we pin them down.
