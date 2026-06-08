# Codex — Continuation: Parts 6, 7, 8

**Author:** Claude (lead designer)
**For:** Codex (engineer)
**Date:** 2026-05-24
**Prereq:** Parts 1–5 shipped and accepted. This continues `PASTE-INTO-CODEX-AGENTIC-OS.md` — that file still holds the full Part 6/7/8 specs. This doc says "proceed" and resolves the two open questions you raised.

> Copy everything between the `=====` lines into your Codex session.

=====

## Parts 1–5 accepted — proceed to Parts 6, 7, 8

Your Parts 1–5 work is reviewed and accepted. The REALM home, KPI strip, Token Burn Meter, Quick Actions, and tabs are good. The conservative wrapper scripts were the right call. Now build Parts 6–8 from `dashboard/PASTE-INTO-CODEX-AGENTIC-OS.md` — the full specs for all three are in that file. This doc resolves your two open questions and adds one design call before you start.

Same working discipline as before: one Part at a time, `typecheck` + `build` after each, commit per Part locally, no `git push`. **Build all three Parts this session** (6, 7, 8) — then report.

---

## RESOLUTION 1 — the Claude cost surface (your open question 1)

You flagged that the Claude cost shows list-price spend (huge numbers) that doesn't reflect actual Max-plan billing. Correct concern. Here is the design call:

**The Token Burn Meter must treat metered vs flat-rate providers differently.**

- **Claude (Max sub) and Codex (ChatGPT Plus) are FLAT-RATE.** Woody pays a fixed monthly fee. Dollars are the wrong unit — they imply metered billing that is not happening. For these two bars:
  - Show **token volume + % of a daily window**, NOT dollars. e.g. `Claude · 12.4M tokens today · 47% of window`.
  - Optionally, a small dim caption: `≈ $X list-price value — covered by Max plan`. Keep it small, gray, clearly secondary. It frames the *value received*, never as *spend*.
- **DeepSeek is METERED — real money.** Its bar stays in **dollars**: `DeepSeek · $0.32 spent today · $4.68 left`. This is the only bar where dollars are the honest unit.
- **Free tiers (Cerebras/Groq/Gemini)** — show as `$0 · N calls today` or % of quota. Never dollars-as-spend.

Net: one meter, but the bars speak the right unit per provider — quota for subscriptions, dollars for the one metered API. This kills the "alarming number" problem and is more honest.

Update `TokenBurnMeter.tsx` accordingly.

---

## RESOLUTION 2 — utility wrappers → triad-aware (your open question 2)

Your conservative wrappers (`plan-today.js`, `process-inbox.js`, `vault-cleanup.js`, `refresh-metrics.js`, `run-doctor.js`) were correct for Parts 1–5. Here is the follow-up path, now that Part 7 builds the triad:

**Split the Quick Actions into two classes:**

| Class | Actions | Behavior after Part 7 |
|---|---|---|
| **Pure utility** (no agent reasoning) | Refresh Metrics, Run Doctor | Keep as plain wrapper scripts. They do not need the triad. Do NOT route them through it. |
| **Agent Forgings** (real reasoning work) | Morning Brief, Deep Research, Plan Today, Process Inbox, Weekly Review, Build Slate, Design Pass, Vault Cleanup | After Part 7, rewire these to dispatch through the triad pipeline (`scripts/triad/forge.js`). Each runs the Interrogator first, then the cost-aware Thinker, then workers. The Part-1–5 wrapper is replaced by the triad call. |

So in Part 7: build the triad, then update `lib/forge-actions.ts` so the 8 agent-Forging actions route through `forge.js` while the 2 utility actions stay as direct wrappers.

---

## DESIGN CALL — before Part 7, read this

The triad's **cost-aware Thinker** is the heart of Part 7. Build it exactly as specced in `PASTE-INTO-CODEX-AGENTIC-OS.md` Part 7, with these emphasis points:

1. **The Thinker shows its plan.** Before any worker runs, the Thinker outputs a visible execution plan: each piece of work + which model it assigned + one-line why. This renders in the Forging Output panel as a "Counsel Scroll" card. Woody sees the routing before money is spent.
2. **The Interrogator always runs first** on every agent Forging — no cap on questions. Non-negotiable.
3. **Fallback chain (locked):** DeepSeek capped → Codex auto-takes-over (no pause). Codex also capped → PAUSE and ask Woody before using free tier. The pause message must name the free model and its quality level: *"DeepSeek and Codex are both unavailable. Continue on Cerebras Qwen 3 235B (free — only a small step down from DeepSeek) or hold?"*
4. **DeepSeek caps:** warn at $0.50/day, hard-stop at $1.50/day. Surface today's DeepSeek spend in the UI.
5. **Critique loops:** quad mode only, max 3 full loops.
6. **Worker routing is auto** (Thinker decides Codex vs DeepSeek per piece) — but always show which model ran each piece.

---

## Build order — this session

1. **Part 6** — auto-start dev server on Windows boot. Create `start-dashboard.bat` + `install-autostart.ps1`. Do NOT run the PS1 — Woody runs it once.
2. **Resolution 1** — fix `TokenBurnMeter.tsx` per the unit-per-provider rule above.
3. **Part 7** — the cost-aware triad pipeline (`scripts/triad/forge.js`), the `codex` + `deepseek` providers in `router.js`, then rewire the 8 agent-Forging Quick Actions through it (Resolution 2).
4. **Part 8** — route cleanup (delete only 100%-redundant routes, keep anything with real content — list your decisions) + write `docs/OBSIDIAN-SETUP.md`.

`typecheck` + `build` after each. Commit per Part. Keep the dev server live at `127.0.0.1:3737` — Woody must be able to open it at any time.

---

## Hard rules (unchanged)

- Don't touch `lib/agent-status.ts`, `personas/*.md`, `content/norse-copy.json`.
- `render.js` — you only own the JSON output block; don't change the markdown logic.
- Don't run `install-autostart.ps1`. Don't `git push`.
- DeepSeek key is in `.env.local` as `DEEPSEEK_API_KEY` — already present.
- Codex CLI is installed; Woody will run `codex login` before the triad is exercised live. If `codex login` is not yet done when you test Part 7, stub the Codex provider gracefully (`{ available: false }`) and note it — do not fail the build.

## Report back

Write `dashboard/docs/codex-to-claude-review-parts-6-8-2026-05-24.md`: what shipped per Part, checkpoints, route keep/delete decisions with reasoning, the triad verified end-to-end (or stubbed where blocked), open questions.

Begin with Part 6.

=====

## Notes for Woody (not part of the Codex prompt)

- After Part 7, the triad spends real DeepSeek money when you click an agent-Forging button. The $0.50/$1.50 caps protect you. The Thinker shows its plan before spending.
- After Part 6, run `install-autostart.ps1` once (Codex will document how) so the dashboard auto-starts on boot.
- Part 8 writes the Obsidian setup doc — that's your guide to wiring the dashboard into Obsidian via Custom Frames + Terminal plugin.
