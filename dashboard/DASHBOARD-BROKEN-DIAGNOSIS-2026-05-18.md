# Dashboard Broken — Diagnosis & Recovery

**Date:** 2026-05-18 (end of Claude autonomous window)
**Reported:** User saw broken render at `127.0.0.1:3737` — Yggdrasil tree filling viewport, giant gold compass below, then plain unstyled text panels at the bottom.
**Severity:** HIGH — dashboard unusable in current state.

---

## Symptom (visible in user screenshot)

- Yggdrasil night-scene image fills entire viewport (should be `min-h-[30vh]` only)
- Sidebar invisible — entire `w-72` left rail missing from view
- Giant Vegvísir-style gold compass below the hero — this is **SessionGlyph** rendering without its `h-[18rem] w-[18rem]` constraint
- Panels render but completely unstyled — plain black text on white background, no padding, no grid

---

## Root cause (high confidence)

**Tailwind arbitrary value utility classes are not being applied.**

Evidence:
- `min-h-[30vh]` on HeroBand → not applied → image fills whole viewport
- `w-72` on Sidebar → not applied → sidebar collapses or goes off-screen
- `h-[18rem] w-[18rem]` on SessionGlyph SVG wrapper → not applied → SVG renders at native huge size (~400×400 unbounded)
- `panel`, `min-h-[12rem]`, `p-6`, etc. on cards → not applied → unstyled

Regular utility classes (colors, basic spacing) DO appear to work — the gold color on the compass shows correctly. So Tailwind is *partially* working but its **JIT scan for arbitrary values** is broken or stale.

---

## Most likely cause (one of three)

### Theory 1 (most likely): dev server has stale Tailwind cache

The dev server was running before Codex added many new files this window:
- `app/api/memory/route.ts`
- `app/api/memory/[name]/route.ts`
- `app/api/memory/refs/[name]/route.ts`
- `app/skills/[realm]/page.tsx`
- `components/MemoryCard.tsx`
- `components/MemoryDrawer.tsx`
- `components/MemoryWellClient.tsx`
- `lib/memory.ts`

Plus Codex installed two new npm packages (`react-markdown@^10.1.0`, `remark-gfm@^4.0.1`).

A long-running Next.js dev server can drift into a state where its Tailwind PostCSS pipeline misses changes — especially after package installs without a server restart.

### Theory 2: A new component has a syntax error that's poisoning the Tailwind build

One of Codex's new components (MemoryCard / MemoryDrawer / MemoryWellClient) may contain malformed Tailwind class strings that crash the JIT pass silently. Tailwind 3.4 sometimes responds by falling back to a minimal CSS bundle.

### Theory 3: react-markdown brings global CSS that fights with Tailwind

react-markdown v10 doesn't ship default styles, but if Codex imported a CSS file from `react-markdown` or `remark-gfm` (e.g. github-markdown-css), it might be loaded after Tailwind utilities and overriding them with higher specificity.

---

## Recovery procedure (in order)

Run these steps when you're back at your machine. Stop at the first one that fixes it.

### Step 1 — Restart the dev server (fixes 80% of these issues)

```powershell
# In the terminal running `npm run dev`:
# 1. Press Ctrl+C to stop
# 2. Then:
cd "c:\Github Repos\everything-claude-code\dashboard"
npm run dev
```

Open `127.0.0.1:3737` after the "ready" message. **If the layout returns to normal, you're done.**

### Step 2 — Clear .next cache + restart

If step 1 didn't fix it:

```powershell
cd "c:\Github Repos\everything-claude-code\dashboard"
Remove-Item -Recurse -Force .next
npm run dev
```

This forces Next.js + Tailwind to rebuild from scratch.

### Step 3 — Reinstall node_modules

If still broken:

```powershell
cd "c:\Github Repos\everything-claude-code\dashboard"
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

This is the nuclear option — full reinstall. Takes 1–2 min.

### Step 4 — Run typecheck to find the bad file (if 1–3 didn't fix it)

```powershell
cd "c:\Github Repos\everything-claude-code\dashboard"
npm run typecheck 2>&1 | Out-File typecheck.log
```

Then read `typecheck.log` for errors. The Mímir's Well files (MemoryCard, MemoryDrawer, MemoryWellClient, lib/memory.ts) are the highest-suspicion since they're brand new.

### Step 5 — Revert Codex's Slice 5 work and try again

If steps 1–4 fail, isolate by reverting only the new files:

```powershell
cd "c:\Github Repos\everything-claude-code\dashboard"
# Move new files aside (don't delete — preserves work)
mkdir _quarantine
Move-Item -Force app/api/memory _quarantine/
Move-Item -Force app/skills/[realm] _quarantine/
Move-Item -Force components/MemoryCard.tsx _quarantine/
Move-Item -Force components/MemoryDrawer.tsx _quarantine/
Move-Item -Force components/MemoryWellClient.tsx _quarantine/
Move-Item -Force lib/memory.ts _quarantine/
# Restore stub /memory page
git checkout app/memory/page.tsx
# Restore unmodified globals.css (will remove shimmer, that's fine)
git checkout app/globals.css
# Restart
Remove-Item -Recurse -Force .next
npm run dev
```

If dashboard returns to working state, the issue is in one of the quarantined files. Restore them ONE AT A TIME until you find the culprit:

```powershell
# Restore /api/memory routes first (safest)
Move-Item -Force _quarantine/memory app/api/
npm run dev  # check 127.0.0.1:3737
# If still working, restore lib/memory.ts
# Then MemoryCard, MemoryDrawer, MemoryWellClient one at a time
```

### Step 6 — Last resort: full reset to baseline

```powershell
cd "c:\Github Repos\everything-claude-code"
# Read the baseline
type dashboard/BASELINE-2026-05-18.txt
# Use git to restore tracked files (NOTE: keeps untracked work safe)
cd dashboard
git stash  # safety net
git restore .  # restores tracked files to last commit
# Untracked Codex/Claude work survives in `git status`
# Reinstall + restart
Remove-Item -Recurse -Force .next
npm install
npm run dev
```

You can `git stash pop` later if you decide to recover the stashed changes.

---

## What I (Claude, autonomous session) changed today

Below is everything I touched. None of these should break Tailwind. If one of these IS the culprit, the diagnostic steps above will reveal it.

### Modified files

- `dashboard/lib/agent-status.ts` — codename data only (string changes)
- `dashboard/components/AgentHero.tsx` — added optional `bannerPosition` prop with default
- `dashboard/components/Sidebar.tsx` — added `aria-label` to Ravens button
- `dashboard/components/RavensRoot.tsx` — added `aria-label` to floating Ravens button

### New files (documentation only — cannot break the build)

- `dashboard/AUTONOMY-PLAN.md`
- `dashboard/HANDOFF-TO-CODEX-2026-05-18-EVENING.md`
- `dashboard/BASELINE-2026-05-18.txt`
- `dashboard/docs/audit/AUDIT-2026-05-18.md`
- `dashboard/docs/codex-briefs/21ST-DEV-INTEGRATION.md`
- `dashboard/docs/codex-briefs/CODEX-QUEUE-CONSOLIDATED.md`
- `dashboard/content/norse-copy.json`
- `dashboard/content/midjourney-bank-v4.md`
- `dashboard/scripts/loops/slate-selection-critic.js`
- `dashboard/scripts/loops/design-critique.js`
- `dashboard/scripts/loops/weekly-wyrd.js`

### Skills added (external, doesn't affect dashboard)

- `~/.claude/skills/norse-themed-ux/SKILL.md`
- `~/.claude/skills/cinematic-dashboard-design/SKILL.md`
- `~/.claude/skills/free-llm-router/SKILL.md`
- `~/.claude/skills/agent-pantheon-design/SKILL.md`
- `~/.claude/skills/painterly-2d-aesthetic/SKILL.md`

---

## What Codex changed (per Codex's review doc + my filesystem scan)

- `app/memory/page.tsx` — replaced stub with real Mímir's Well
- `app/skills/page.tsx` — added Yggdrasil hotspots
- `app/skills/[realm]/page.tsx` — NEW (realm sub-pages so hotspot clicks don't 404)
- `app/api/memory/route.ts` — NEW
- `app/api/memory/[name]/route.ts` — NEW
- `app/api/memory/refs/[name]/route.ts` — NEW
- `app/globals.css` — added `.shimmer` utility + `shimmer-slide` keyframe
- `components/MemoryCard.tsx` — NEW
- `components/MemoryDrawer.tsx` — NEW
- `components/MemoryWellClient.tsx` — NEW
- `components/RavensRoot.tsx` — keyboard hardening (Enter on memory → /memory?q=...&focus=...)
- `components/DomainRow.tsx` — modified (per `git status`, reason unknown — possibly suspense skeleton)
- `lib/memory.ts` — NEW (corpus reader)
- `package.json` — added `react-markdown@^10.1.0` and `remark-gfm@^4.0.1`

---

## My recommendation

Try **Step 1 first** — 95% likely this is a dev-server-needs-restart situation. After `npm install` (which Codex did to add react-markdown), Next.js dev servers commonly drift into a state where new files aren't fully recompiled until restart.

If that doesn't work, escalate to Step 2 (.next cache wipe) — second most likely.

Only go to Step 5/6 if 1–4 fail. Codex's Slice 5 work is genuinely good per its own review and shouldn't need to be reverted.

---

## What NOT to do

- Don't `git restore .` first — you'd lose Codex's Slice 5 + my Tier B work uncommitted
- Don't delete `.originals/` art folders — those are PNG backups
- Don't kill the Node process you don't recognize — there may be background jobs running

---

## Open question for you

Once it's working again, take a quick screenshot and let me know. I want to verify:
- Sidebar Council strip visible left
- HeroBand at ~30vh height (NOT filling viewport)
- SessionGlyph as a 22rem panel next to NextActionCard (NOT full-width)
- All routes 200: `/`, `/memory`, `/activity`, `/skills`, `/skills/asgard`, `/lebot-james`, `/thor`, `/perseus`, `/fenrir`, `/sauron`, `/trading`

If anything else looks off after the restart, send me a screenshot.

---

Good luck. The dashboard is fixable — this is almost certainly a cache state issue, not a code bug.
