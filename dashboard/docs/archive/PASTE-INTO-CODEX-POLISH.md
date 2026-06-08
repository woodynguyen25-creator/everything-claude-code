# Codex — Final Polish & Verification Pass

**Author:** Claude (lead designer)
**For:** Codex (engineer)
**Date:** 2026-05-25
**Context:** The Agentic OS dashboard is functionally complete — REALM home, Token Burn, KPI strip, Quick Actions, the cost-aware triad, Heimdall's Watch, agent councils, Mímir's Well, Yggdrasil, trading. This is **not another feature slice.** It is a polish + verification pass to make the whole thing feel finished and trustworthy before Woody embeds it in Obsidian and lives in it.

> Copy everything between the `=====` lines into a fresh Codex session.

=====

## Your three open questions — answered

**Q1 — Codex-worker reliability under triad load.** The current behavior — safe pause-and-ask before any free-tier downgrade — is **sufficient. Do not dedicate a pass to chasing Codex-worker perfection.** DeepSeek is the primary paid worker; Codex is the fallback; the pause is an acceptable floor when both are unavailable. Revisit only if it becomes a real daily annoyance.

**Q2 — Heimdall tally rail.** Keep it **minimal**. Do not expand into a dense operator rail. The current N-Forgings / $-spent / N-loops summary is right for v1.

**Q3 — /activity scope.** Keep it **broad and realm-wide**. Do not make it task/trading-specific. Deep trading history belongs on `/trading`, not Heimdall.

All three: hold. No expansion. This pass is polish, not growth.

## This pass — make it feel finished

Heimdall accepted. Now go surface-by-surface and make the whole dashboard feel like a shipped product. Six items, in order:

### 1. Route audit
Visit every route. For each: confirm 200, confirm it renders real data (not placeholder), confirm zero console errors, confirm no broken internal links.
```
/  ·  /memory  ·  /activity  ·  /skills  ·  /skills/[realm]  ·  /trading
/lebot-james  /thor  /perseus  /fenrir  /sauron  ·  /[agent]/[threadId]
```
Fix anything broken. List the result per route in the review doc.

### 2. Loading + empty states
Every panel that loads async needs: a **shimmer skeleton** while loading, and a **Norse empty state** when there's no data (pull copy from `content/norse-copy.json`). Audit all panels — KPI strip, Token Burn, Latest Forging, Dreaming Surfaces, Heimdall timeline, Quick Actions results, council threads. Any panel that flashes blank, pops in, or shows a raw "no data" → fix it.

### 3. Visual consistency sweep
Walk every surface against the locked style rules and fix violations:
- Cinzel display ≥24px ONLY — no Cinzel on small text
- OKLCH palette only — no stray hex colors, no off-palette colors
- `panel` utility on every card — consistent borders, radius, no random shadows
- Asymmetric grids (62/38, 2/1/1) — no accidental equal grids on main surfaces
- IBM Plex Mono on all numerics (costs, counts, timestamps)
- Hover/focus states on every interactive element — none should be flat
- AmbientEmbers present where it should be
Anything that looks like a default Tailwind/shadcn component → bring it onto the brand.

### 4. Dead code cleanup
Remove unused components, unused imports, dead files, commented-out blocks, any leftover scaffolding from earlier slices. Run a quick scan for unreferenced files in `components/` and `lib/`. Keep the diff conservative — when unsure, leave it and list it.

### 5. Resilience check
- Every API route: does it handle its data source being missing/empty without throwing? (`data/*.json` absent, SQLite empty, a loop never run.) Wrap in graceful fallbacks.
- The triad: if `.env.local` keys are missing, does it fail with a clear message, not a crash?
- Kill the dev server's data files one at a time mentally — does the dashboard degrade gracefully or white-screen? Fix any white-screen.

### 6. Final state doc
Write `dashboard/docs/DASHBOARD-STATE-2026-05-25.md`: every route + what it does + its data sources, every Quick Action + what it dispatches, the triad flow, the Token Burn logic, known limitations. This is the reference doc for the finished dashboard.

## Working discipline
One item at a time · `typecheck` + `build` after each · commit per item · no `git push` · keep `127.0.0.1:3737` live. Build all 6 items, then report.

## Hard rules (unchanged)
- Don't touch `lib/agent-status.ts`, `personas/*.md`, `content/norse-copy.json`.
- `render.js` — JSON output block only.
- No new npm packages. No new features — this is polish only. If you find a missing feature, list it in the review doc; do not build it.

## Report back
`dashboard/docs/codex-to-claude-review-polish-2026-05-25.md`: route audit table, loading/empty-state fixes, visual violations found + fixed, dead code removed, resilience gaps closed, anything you chose to leave + why.

This is likely the last build pass for a while — after this, Woody embeds the dashboard in Obsidian and lives in it. Make it finished.

Begin with item 1.

=====

## Notes for Woody (not part of the Codex prompt)

This is deliberately the **last build pass I'm queuing for Codex.** After this, the dashboard is done enough — the right move is to embed it in Obsidian (Custom Frames + terminal, per `docs/OBSIDIAN-SETUP.md`), live in it for real, and let actual daily use tell us what to build next. Building more slices before using it is the trap. While Codex runs this pass, I can do a visual design review of the live dashboard and feed Codex any specific look fixes.
