# Handoff to Codex — AIOS Dashboard v1 foundation

**From:** Claude Opus 4.7 (in `everything-claude-code` session)
**Date:** 2026-05-18
**Status:** v1 foundation built, smoke-tested, ready for audit pass

---

## TL;DR

I built the v1 foundation in `c:\Github Repos\everything-claude-code\dashboard\`. Per Woody's locked decisions:

- **Theme**: Norse mythology (locked, do not change)
- **Repo location**: ECC/dashboard (locked, do not move)
- **Implementer split going forward**: Codex leads code; Claude leads design critique + UX copy

Woody has decided you (Codex) lead implementation/architecture from here; I switch to critique/UX. This handoff exists so you can audit my foundation and either accept it as the base, refactor it, or replace it.

## What runs right now

```bash
cd c:\Github Repos\everything-claude-code\dashboard
npm install
npm run dev   # → http://localhost:3737
```

- All 5 page routes return 200
- All 3 API routes return correct shapes with REAL data:
  - `/api/doctor` parses Woody's live `~/.claude/logs/aios-doctor/last-run.json`
  - `/api/trading` finds ParlayBot's `calibration.json`
  - `/api/tasks` SQLite CRUD verified end-to-end
- `npx tsc --noEmit` is clean
- Dev server boots in 1.1s

## What's locked (don't change without asking Woody)

1. Norse theme — Odin (gold), Fenrir (blood), Cinzel font, runes
2. Repo at `everything-claude-code/dashboard/`
3. Port 3737
4. Localhost-only, no cloud
5. Personas deferred to v2
6. SVG glyph placeholders (real art swapped manually later)

## What's open for you to refactor / improve

### Data layer
- `lib/trading.ts` does naive substring matching for "brief" / "morning" in filenames. Once ParlayBot output schema stabilizes, replace with a typed contract.
- No error boundaries — one bad fs.readFile in an RSC will 500 the page. Consider `error.tsx` files per route.
- Doctor reader assumes JSON shape never changes. Add Zod validation if you want hard guarantees.

### Architecture
- Panels are RSC awaiting in `page.tsx`. Could be Suspense streams for better TTFB.
- Tasks live in `data/tasks.db`. Should they mirror to Obsidian as daily exports? Source-of-truth split says SQLite is canonical.
- `PromptBar` submit is a console.info stub. Needs the Claude OS Bridge skill in v1.5.

### Foundation
- `globals.css` loads Google Fonts via `@import url(...)` — render-blocking. Migrate to `next/font/google` for performance.
- `next.config.mjs` is minimal. No image optimization, headers, or experimental flags beyond `serverComponentsExternalPackages: ['better-sqlite3']`.
- No tests (intentional for v1). v1.5 should add a Playwright smoke pass.

### Design system
- Norse tokens live in `tailwind.config.ts`. Could extract to a `tokens.css` for clearer separation.
- Animation set (`ember-pulse`, `rune-glow`) is minimal. Room for "scry" / "rune-trace" type entrance animations.

## Source-of-truth split (Woody asked me to address Codex's question)

Codex proposed: **repo = canonical, Obsidian = context, claude-mem = recall**. I agree, with these failure-mode guardrails:

1. **Drift risk between SQLite tasks and Obsidian task notes** if Woody logs in both
   → Fix: SQLite is canonical; export to Obsidian daily as read-only mirror.
2. **claude-mem records can stale-claim authority** on decisions the repo doesn't reflect
   → Fix: code-first; memory = suggestion, never source.
3. **Obsidian context edits during runtime reads**
   → Fix: when dashboard reads Obsidian, treat as read-only with 5min cache + content-hash invalidation.

## Suggested collaboration loop

1. **You (Codex)** audit my code. Refactor anything ugly, suggest architectural improvements, propose v1.5 / v2 phasing.
2. **Me (Claude)** critique the running app: visual taste, UX copy, hover/focus, motion polish, IA tightening. Compare against Mission Control / ClawPort / Captain Claw references.
3. **You** implement my critique notes.
4. **Me** re-review against the changes.
5. Loop until v1 ships.

When you have specific architectural questions, drop them in this file under "Questions for Claude" and Woody will resurface them in my next session.

## Questions for Claude (Codex fills in)

_(empty — fill as you audit)_

---

**End of handoff.** Foundation is yours to audit/extend.
