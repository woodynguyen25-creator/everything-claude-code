# Slice 3.5 Critique — Migration + Polish

**Verdict: ACCEPTED as the new home baseline.** Codex shipped everything cleanly + added a bonus persona reader. Architectural split is live, polish items all landed, runtime is healthy.

The earlier "page route hang" turned out to be PowerShell `Invoke-WebRequest` noise — `next build` and direct `curl.exe -I` confirmed routes are fine. Diagnosed correctly in the earlier critique; Codex confirmed.

---

## What's right (substantive)

1. **`/lebot-james` is the right shape.** Stub reads from `lib/personas.ts` (the persona file consumption is exactly the integration I wanted) and has the AWAITING THE RAVENS copy. Doesn't over-decorate a stub.
2. **`lib/personas.ts` is a bonus win.** I didn't explicitly ask Codex to build the reader, but it's the right move — keeps the persona files Claude-owned (no edits) while letting the dashboard consume frontmatter. Clean separation.
3. **PanelSignal migration is honest.** Doctor and Tasks now expose the contract shape — `getDoctorSignal()`, `getTasksSignal()`, `getOpenCriticalTask()` — without forcing a unified panel renderer that would lose their distinct visual jobs.
4. **All 8 polish items landed.** Realm-label dedup, weekend greeting bug, PulseClock separator, profile.json schedule, NextActionCard body bump, dead actionTone branch cleaned, `void year` resolved, DomainRow `md:` fallback all confirmed live in the code.
5. **Vegvísir SessionGlyph is the right call** — operator's mark on operator's home. Don't tune it.

---

## Codex's "still rough" items — my take

| Item | My answer |
|---|---|
| Doctor + Tasks not using single shared visual renderer | **Leave it.** They have legitimately different shapes (Trading = list of cards, Doctor = single signal + grid stats, Tasks = signal + top-3 preview). Forcing one renderer adds conditional bloat. The PanelSignal *contract* is what matters — visual treatment can vary. |
| `/lebot-james` is just a stub | **Correct.** Don't over-decorate. Full chat surface lands in Slice 4 (Ravens). |
| 100-quote bank present, no visual verification sweep | **Non-blocker.** Quotes are seeded by date hash. If you want, randomly visit `/` on a few different days and confirm quote variety — but the rotation logic is correct in `lib/mode.ts`. |
| HTML source shows duplicated server-component transport data for "realm under watch" phrase | **Serialization noise, not a visible bug.** That's React Server Components' internal payload mechanic. As long as the user sees the phrase once visually, ignore it. |

---

## Answers to Codex's 5 questions

| # | Question | Answer |
|---|---|---|
| 1 | Is Slice 3.5 accepted as the new baseline? | **Yes.** Clean ship. Architecture is right. |
| 2 | Doctor + Tasks need another pass for visual unification? | **No.** Different shapes, same contract. Don't unify the renderer. Optional later: extract atomic primitives (freshness dot, action button, source label) as shared sub-components. |
| 3 | Should `/lebot-james` stay as-is until Slice 4? | **Stay as-is.** The Council expansion in Slice 3.6 changes the sidebar entry; the `/lebot-james` page itself doesn't need treatment until the chat surface arrives. |
| 4 | Is Vegvísir the right permanent home mark? | **Yes.** Don't tune. Operator's mark on operator's home. |
| 5 | Next 3 implementation priorities? | See below. |

---

## Next 3 implementation priorities

### Priority 1 — **Slice 3.6: Home Polish + Council Expansion** (~1 day)

**Already specced in full at:** `dashboard/docs/claude-home-polish-instructions.md`

The Council moves to a 5-agent layout in the sidebar (Option B — portraits + status dots). Home gets atmospheric polish (Midjourney scene wiring with gradient fallback, drifting embers, SessionGlyph breath animation, staggered fade-in entrance). `/skills` gets the simple Yggdrasil hotspot treatment. Brand block upgrades to "WOODY'S REALM" + Vegvísir sigil + live date. Footer gets the 8-MCP Connections strip.

This is the final v1 polish pass before Ravens lands. Ships as one atomic PR.

### Priority 2 — **Slice 4: The Ravens (Oracle Drawer + ⌘K)** (~1-2 days)

**Already specced in full at:** `dashboard/docs/RAVENS-DRAWER-SPEC.md`

The productivity unlock. `⌘K` slides in a 420px drawer with hybrid memory + file search + agent escalation. This is the keystone v1.5 feature that turns the dashboard from "beautiful overview" → "actual operator surface."

Codex reads the 5 persona files in `dashboard/personas/*.md` to power the agent routing + voice preambles.

### Priority 3 — **Slice 5: Life-Dashboard Foundation** (~1 day)

Begin v2 cognitive theater. Just placeholders for Hoard / Forge / Daily Rites / Saga panels — elegant empty states with "v2: Plaid integration coming" / "v2: Apple Health coming" etc. Plus wire the existing `/skills` Yggdrasil hotspots to real data once the night scene image lands.

Don't build Plaid or Apple Health integration yet. Just the panel surfaces.

---

## Message to Codex

> **Codex —**
>
> Slice 3.5 accepted as new baseline. Clean ship. Architecture is right. Persona reader was a great bonus addition.
>
> **Don't refactor Doctor + Tasks into a shared visual renderer.** They have legitimately different visual shapes; the PanelSignal contract is what matters. Optional later: extract shared atomic primitives, but not now.
>
> **Don't decorate `/lebot-james` further.** Stub is correct until Slice 4.
>
> **Don't tune the Vegvísir.** It's the operator's mark, leave it alone.
>
> **Next: ship Slice 3.6 (Home Polish + Council Expansion) as one atomic PR.**
>
> Spec is at `dashboard/docs/claude-home-polish-instructions.md`. It covers:
> - Sidebar Council expansion to 5 agents (Option B layout — portrait slots + status dots wired to real data)
> - Brand block upgrade to "WOODY'S REALM" + Vegvísir sigil + live date
> - Footer Connections strip (8 MCP icons in 2×4 grid)
> - HeroBand wired to 4 Midjourney scenes (with gradient fallback when image absent)
> - Drifting warm embers ambient motion
> - SessionGlyph radial glow + 4s breath animation
> - Staggered fade-in page entrance
> - `/skills` Yggdrasil hotspots (with vertical-list fallback)
> - Apple-tactile hover/click feedback on agent cards
>
> **Then Slice 4 (Ravens — Oracle Drawer + ⌘K)** at `dashboard/docs/RAVENS-DRAWER-SPEC.md`.
>
> **Don't touch:** `data/quotes.json`, `personas/*.md`, `DESIGN-LANGUAGE.md`, `RAVENS-DRAWER-SPEC.md`. Claude's lane.
>
> Ship Slice 3.6 first. Critique loop continues after handoff.

---

**End of critique.**
