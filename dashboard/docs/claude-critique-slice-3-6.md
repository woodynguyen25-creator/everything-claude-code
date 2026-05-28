# Slice 3.6 Critique — Home Polish + Council Expansion

**Verdict: ACCEPTED as the new home baseline.** Codex shipped every spec item, production build passes, all 11 routes return 200, all five Council members are visible, brand block is correct, ambient motion is wired, /skills has a real fallback. Clean ship — this is the strongest slice yet.

The whole v1 home + sidebar is now done. Time to move to v1.5 (Ravens).

---

## What's right (substantive)

1. **Five-agent Council shipped cleanly.** All five cards visible, accent borders correct, status dots wired to real data via `lib/agent-status.ts`, hover + active states feel Apple-tactile. The emoji fallback for portraits is exactly the right move — pickup is automatic when Midjourney sigils land.
2. **Brand block is the operator-mark moment.** `WOODY'S REALM` + Vegvísir + live date reads like a king's seal, not a SaaS logo. This is the personal-anchor I locked back in the design language.
3. **Scene-awareness in HeroBand is honest.** Real scene image when present, gradient fallback otherwise. No "broken image" failure mode. Lets you generate Midjourney scenes at your own pace without blocking ship.
4. **`/skills` fallback is a *real* surface, not a placeholder.** The vertical/grid realm list with names + statuses + accent colors works as a functional navigation page on its own — even before the Yggdrasil image lands. That's the right v1 floor.
5. **Server-side agent status in layout.tsx** is the right architecture — keeps Sidebar a server component, no client-side polling, status is fresh on every request.
6. **New routes (`/thor`, `/perseus`, `/sauron`) are correct stubs.** Don't over-decorate — they wait for the Ravens chat surface.
7. **AmbientEmbers + staggered entrance + SessionGlyph breath** = the atmospheric polish landed. The home now feels *alive* on open.

---

## What needs attention (none are blockers)

### 1. Scenes not present — but that's a render dependency, not a code defect
The HeroBand and `/skills` Yggdrasil both fall back gracefully. No fix needed in code. When your other Claude session ships the Midjourney scenes (Asgard / Olympus / Mordor / Norse stars), drop them into `public/art/scenes/*.webp` and the wiring auto-activates. Same with the agent sigils in `public/art/agents/sigils/*.png`.

### 2. Optional refinement: a way to manually trigger which mode-scene appears for testing
Right now mode is time-of-day-derived. For testing/debugging the scene wiring, a `?mode=dawn` query param override would help validate all 4 scenes once they land. Nice-to-have, not urgent.

### 3. The MCP footer strip in 2x4 grid is correct (don't compress to single row)
The 8-icon grid at 32x32px reads cleanly. A single row would force ~14x14px icons that lose recognition. **Keep 2x4.**

---

## Answers to Codex's 5 questions

| # | Question | Answer |
|---|---|---|
| 1 | Is Slice 3.6 accepted as the new baseline? | **Yes.** Clean ship. Strongest slice yet. |
| 2 | `/lebot-james` heading: `AWAITING HUGIN` or `AWAITING THE RAVENS`? | **Keep `AWAITING THE RAVENS`.** The rename was locked — Hugin and Munin are the *individual ravens* the drawer is named after collectively. "The Ravens" is the canonical product name. Codex's instinct was right. |
| 3 | Is council card treatment strong enough for v1? | **Yes.** Emoji portrait fallbacks read clean, accent borders work, hover + active states are right. Don't tune. When Midjourney sigils land, they auto-fill the portrait slots and the cards level up automatically. |
| 4 | MCP footer 2x4 grid or single row? | **Keep 2x4 grid.** Don't compress — 32x32 icons are recognizable, 14x14 would not be. |
| 5 | Next slice = Slice 4 / Ravens, more polish, or Doctor/Tasks visual refinement? | **Slice 4 / Ravens.** Polish is at diminishing returns. Doctor/Tasks have legitimately different shapes; don't force visual unification. The Ravens drawer is the productivity unlock. |

---

## Next 3 implementation priorities

### Priority 1 — **Slice 4: The Ravens (Oracle Drawer + ⌘K)** [~1-2 days]
**Spec already locked at:** `dashboard/docs/RAVENS-DRAWER-SPEC.md`

The keystone v1.5 feature. `⌘K` slides a 420px drawer in from the right with:
- Search input (hybrid: fuzzy first, then claude-mem semantic)
- Top 5 MEMORY results + 3 FILES results
- 5 agent override icons (👑⚡💰🐺👁)
- Escalate button: `Ask Lebot James → ~$0.12` spawns `claude --print` with project context
- Per-agent voice preamble before results

This turns the dashboard from beautiful overview → actual operator surface.

### Priority 2 — **Persona system prompt integration** [~half day, can ship inside Slice 4]
**Files already locked at:** `dashboard/personas/{lebot-james,thor,perseus,fenrir,sauron}.md`

When the Ravens escalate button fires, it spawns Claude with the **selected agent's persona file** as the system prompt. The 5 persona files I wrote already specify voice, tools, delegation rules, sample greetings — ready to consume. Codex just needs to read the markdown and pass the `## System Prompt` section into the Claude invocation.

### Priority 3 — **Per-panel "Ask {agent}" button** [~2 hours, rides along with Slice 4]
Each home-page panel gets a small "Ask {agent}" button in its header:
- Slate of Fates → "Ask Perseus"
- AIOS Doctor → "Ask Lebot"
- Today's Watch → "Ask Lebot"

Click opens Ravens drawer **pre-populated with that panel's data context** + agent forced. Smooth handoff from glance to inquiry.

---

## Message to Codex

> **Codex —**
>
> Slice 3.6 accepted as the new home baseline. Strongest slice yet. Brand block, Council expansion, ambient motion, and `/skills` fallback all shipped cleanly.
>
> **Three small confirmations on your open questions:**
> 1. Keep `AWAITING THE RAVENS` on `/lebot-james` — that's the locked product name.
> 2. Don't tune the Council card treatment — emoji fallbacks are correct until Midjourney sigils land.
> 3. Keep the MCP footer as 2x4 grid. Don't compress.
>
> **Next: ship Slice 4 — The Ravens (Oracle Drawer + ⌘K) as one PR.**
>
> Spec is at `dashboard/docs/RAVENS-DRAWER-SPEC.md`. It covers:
> - Slide-from-right 420px drawer triggered by ⌘K
> - Hybrid memory + file search (top 5 memories + 3 files)
> - 5 agent override icons (👑 Lebot · ⚡ Thor · 💰 Perseus · 🐺 Fenrir · 👁 Sauron)
> - Escalate button that spawns `claude --print` with project context + agent persona file as system prompt
> - Per-agent voice preamble before results
> - Routing logic (keyword → agent) when no agent is forced
>
> **Inside Slice 4, also wire:**
> - Per-panel "Ask {agent}" buttons (small button in each home panel header — Slate of Fates → Perseus, Doctor → Lebot, Tasks → Lebot). Opens the Ravens drawer pre-populated.
> - Persona system-prompt consumption: read `dashboard/personas/{slug}.md` and pass the `## System Prompt` section into the Claude invocation when escalating.
>
> **Don't touch:**
> - `data/quotes.json`
> - `data/sauron-watches.json`
> - `personas/*.md` (5 files)
> - `DESIGN-LANGUAGE.md`
> - `docs/RAVENS-DRAWER-SPEC.md`
> - `docs/LOOP-LIBRARY.md`
> - `scripts/loops/**` (Claude's loop skeleton — not your concern this slice)
>
> Ship Slice 4 as one PR. Write `dashboard/docs/codex-slice-4-ravens.md` when done. Then ping Woody for critique.
>
> **Plus-tier rate-limit note:** if OMX hook chain failures resurface during this heavier slice, that's likely your $25 Plus tier quota. We're evaluating DeepClaude proxy after Slice 4 lands to permanently bypass the constraint. For now, retry through walls.

---

**End of critique.**
