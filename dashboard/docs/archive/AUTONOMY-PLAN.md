# Autonomous Work Plan — 2026-05-18

**Baseline ref:** `BASELINE-2026-05-18.txt` in dashboard root.
**Session:** Sonnet, unattended, 3–4 hour window.
**Permission posture:** Files only. No installs, no system commands, no destructive ops.

## Scope — Tier A (all)

1. Architecture audit doc — `docs/audit/AUDIT-2026-05-18.md`
2. Norse copy library — `content/norse-copy.json`
3. Codex briefs:
   - `docs/codex-briefs/21ST-DEV-INTEGRATION.md`
   - `docs/codex-briefs/CODEX-QUEUE-CONSOLIDATED.md`
4. Loop skeletons:
   - `scripts/loops/slate-selection-critic.js` (Loop 2)
   - `scripts/loops/design-critique.js` (Loop 3)
   - `scripts/loops/weekly-wyrd.js` (Loop 5)
5. Skill library expansion (`~/.claude/skills/`):
   - `norse-themed-ux/SKILL.md`
   - `cinematic-dashboard-design/SKILL.md`
   - `free-llm-router/SKILL.md`
   - `agent-pantheon-design/SKILL.md`
   - `painterly-2d-aesthetic/SKILL.md`
6. Midjourney prompt bank v4 — `content/midjourney-bank-v4.md`

## Scope — Tier B (selective)

- Banner `object-position` tuning per agent page (lebot-james, thor, perseus, fenrir, sauron)
- Loading state shimmer additions to placeholder panels (Hoard, Forge, Daily Rites, Saga)

## Out of scope (deferred to Codex)

- `/memory` page real implementation
- `/activity` page real implementation
- Yggdrasil hotspot wiring
- npm installs / Tailwind config changes
- Any 21st.dev component code (Codex's lane)
- DB schema changes
- Slice 5+ work

## Output convention

- Every file written goes under `dashboard/` or `~/.claude/skills/`
- New directories created lazily via Write tool
- Final summary lands at `dashboard/WORK-LOG-2026-05-18.md`

## Revert procedure

If anything is broken:
1. `git status` to see new untracked files
2. `git restore .` only restores tracked changes (safe — most work is new files)
3. Manually delete any unwanted new file
4. Baseline reference: `dashboard/BASELINE-2026-05-18.txt`
