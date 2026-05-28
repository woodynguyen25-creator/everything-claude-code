# Codex — Dashboard Refinement Pass (Visual Review Fixes + Home Polish)

**Author:** Claude (lead designer)
**For:** Codex (engineer)
**Date:** 2026-05-25
**Context:** Claude ran a full Playwright visual review of every route (`dashboard/docs/VISUAL-REVIEW-2026-05-25.md`). It found 26 issues — real shipped bugs, brand failures, layout voids. Woody reviewed the findings and made the calls below. This brief turns all of it into one clean refinement pass. **Read `VISUAL-REVIEW-2026-05-25.md` first** — it has the evidence and screenshots context. This brief is the action list.

> Copy everything between the `=====` lines into a fresh Codex session.

=====

## Woody's decisions (locked — do not re-litigate)

- **Hero:** full-bleed cinematic. Image edge-to-edge, headline over it with a real scrim.
- **Token Burn:** reframe it to behave like Claude Code's `/usage` — a bar showing how much of the plan window is left before the cap, with a real reset countdown.
- **CTA color:** **gold = primary actions. Red (blood) = destructive/urgent only.** No exceptions.
- **Activity:** the home page currently shows activity twice. Keep it **once**. Keep "Dreaming Surfaces" (the insight cards), delete the terminal-style "Activity" panel. `/activity` (Heimdall) stays as the full view.
- **Agent pages:** redesign them to look as good as possible — Claude's recommended single-column layout below.
- **Mobile:** deferred. Gate it (see item 12). Do not build a full responsive layout this pass.
- **Imagery (Ravens symbol, top-left rune):** Woody is generating custom AI art for these later. This pass only does **interim on-palette styling** — see items 7 and 8. Do not source or invent final art.

## Working discipline

One item at a time. `npm run typecheck` + `npm run build` after each. One commit per item. No `git push`. Keep `127.0.0.1:3737` live. 14 items, in priority order. Build all, then write the review doc.

## Hard rules (unchanged)

- Don't touch `lib/agent-status.ts`, `personas/*.md`, `content/norse-copy.json`.
- `render.js` — JSON output block only.
- OKLCH palette only. No hex. No off-palette colors (no pink/magenta anywhere).
- Cinzel display ≥24px ONLY.
- IBM Plex Mono on all numerics.
- `panel` utility on every card.

---

## ITEM 1 — Render markdown in insight strings (CRITICAL bug)

Dreaming Surfaces, and Heimdall's Watch (`/activity`), print literal `**asterisks**` on screen — e.g. `You called \`Skill\` **84** this week`. The insight strings carry markdown that is rendered as plain text.

**Fix:** render those strings through the same markdown path already used in chat (`react-markdown` + `remark-gfm` are already dependencies). For these short single-line insights, a minimal inline renderer is fine — bold + inline code only. Apply everywhere these insight strings render. After the fix, **no `**` or stray markdown is visible anywhere on any route.** Grep the rendered output to confirm.

## ITEM 2 — Hero: full-bleed cinematic + fix the photo, leading, scrim (CRITICAL brand)

Current hero is a **stock photograph** of a Greek temple. The brand is painterly Theros × Hades. Three fixes:

1. **Image:** remove the photograph. Woody will supply painterly hero art later. For now, ship the hero with a **deep painterly gradient placeholder** built from palette tokens (rich black → faint rune-gold glow, radial, low) — NOT a photo, NOT a flat color. Leave a clearly-named prop/constant (`HERO_IMAGE`) so dropping in the real art later is a one-line change.
2. **Full-bleed:** image/gradient goes edge-to-edge across the content area — no panel border, no inset. Headline sits over it.
3. **Leading + scrim:** the Cinzel headline currently has crushed line-height — "LORD" and "WOODY" nearly collide. Set `leading-[1.08]` minimum on the hero display. Add a bottom-up scrim (`linear-gradient(transparent, oklch(8% 0 0 / 0.85))`) behind the headline/date so gold text always clears WCAG AA contrast regardless of what's behind it.

## ITEM 3 — Token Burn → "Plan Usage" `/usage`-style meter (CRITICAL data bug)

Current `components/TokenBurnMeter.tsx` shows `2261.7M tokens today` — billions — because `claudeTokens` sums `cache_read + cache_write` (cache tokens dwarf real tokens ~100×) and divides by an invented `25_000_000` window, pinning the bar at 100% forever. The heading says `LAST 5H WINDOW`; the numbers say `today`.

**Reframe the whole panel to mirror Claude Code's `/usage`. The ONLY question it answers: "how much do I have left before I hit a limit?"**

Claude Max has **two** limits that matter, both must appear:

1. **5-hour session window** — resets every 5h from the first message of the window.
2. **Weekly limit** — resets weekly. (Claude Max has a separate weekly Opus cap; if separable, show Opus weekly distinctly. If not, one weekly bar is fine.)

Build it like this:

- **Two bars, stacked: "5h window" and "this week."** Each shows: `% used` · a real **reset countdown** (`resets in 2h 14m` / `resets Sunday`) · the headline is the percentage and the countdown, nothing else.
- **Realistic token accounting.** Sum tokens from the transcripts (`render.js` already does this) within each rolling window. **Exclude `cache_read`/`cache_write` from the limit figure** — they do not burn the plan the way input/output do; show them only as a muted footnote if at all.
- **Weight by model.** Opus consumes the plan far faster than Sonnet — weight Opus tokens heavier than Sonnet (start with Opus ≈ 5× Sonnet; expose the multiplier as a named constant).
- **Calibratable ceiling.** The true cap is not published. Use a clearly-named, commented constant for each denominator (`FIVE_HOUR_LIMIT_EST`, `WEEKLY_LIMIT_EST`). Woody will calibrate them: when he runs `/usage` and sees the real %, he divides the dashboard's counted tokens by that % to get the true ceiling and updates the constant. Add a one-line code comment explaining exactly this calibration step so it is obvious later.
- Heading: rename to `PLAN USAGE` (or a Norse name). The panel must read "73% of the 5h window used · resets in 1h 40m" — never a pinned, meaningless 100%.
- DeepSeek bar = real metered spend vs cap. Free bar = honest quota or "unmetered". Codex bar = real or honest "awaiting poll".

This is the panel Woody looks at to know when he'll get rate-limited. It only has to be **realistic and honest** — a believable estimate that moves correctly beats a fake-precise number. Treat it as the most important panel on the page.

## ITEM 4 — `/trading` Latest Slate: format the JSON (CRITICAL unfinished)

The "Latest Slate" card on `/trading` dumps a raw JSON blob (`[{"player":"Brandon Nimmo","stat":"batter_hits"...}]`). Parse it and render readable rows: player · stat · line · pick (over/under) · odds · EV. Match the styling of the "Active Signals" card beside it. No raw JSON visible anywhere.

## ITEM 5 — Chat thread scroll: behave like ChatGPT (HIGH — Woody's #1 complaint)

`components/chat/ChatStream.tsx` calls `endRef.current?.scrollIntoView({ block: 'end' })` on **every** messages/streaming change. `scrollIntoView` bubbles to the document, so opening a thread yanks the **whole page** to the bottom. Woody wants ChatGPT behavior.

**Fix:**
1. The chat must scroll **inside its own container**, never the page. Constrain `ChatSurface` to viewport height (`h-screen` / `h-[100dvh]` minus any header) so the message list (`overflow-y-auto`) is the only scroll region. The page itself must not scroll on a thread route.
2. Replace `scrollIntoView` with **sticky-bottom** behavior: scroll the *container* (`container.scrollTop = container.scrollHeight`), and only auto-scroll when the user is already near the bottom (within ~120px). If the user has scrolled up to read history, **do not yank them down** when new tokens stream or messages arrive.
3. On initial thread load: jump the container to the bottom **once, without animation**, so the latest message is visible — but the user can immediately scroll up freely through the whole history.
4. Optional nicety: a small "↓ jump to latest" affordance that appears only when the user is scrolled up during streaming.

Verify: open a long thread → page does not move; you land at the latest message; scrolling up stays put; sending a new message scrolls the container (not the page) to the bottom.

## ITEM 6 — Agent pages: single-column redesign (HIGH)

`/lebot-james`, `/perseus`, `/fenrir`, `/sauron` render a 4-column layout (nav · Past Sagas · center · Scrying Pool) where, empty, 3 of 4 columns are black void with "No councils yet" / "Mímir does not know that yet."

**Redesign to a focused single center column:**
- Center the agent: avatar, name (Cinzel ≥24px), one-line role, the agent's Norse greeting.
- Below it, the council composer (prompt + cost estimate + SUMMON button) — this is the primary action, give it presence.
- **Past Sagas** → a collapsed strip *above or below* the composer, not a permanent empty column. When there are 0 threads, render a single quiet line, not a whole empty panel.
- **Scrying Pool** (Memory/Voice/Saga) → move into a collapsible drawer or a tab on the composer, not a permanent empty column.
- Result: when an agent has no history, the page is a **clean, centered, intentional empty state** — not four black columns.
- Apply the agent's accent color (gold/bifrost/emerald/blood/fire) as the single accent.
- Per item 13, drop a `BorderBeam` on the active agent in the sidebar.

When a thread IS open, the layout is the chat surface from item 5 — and it must use the full width (currently Thor's thread floats with half the width as black void — fix that here).

## ITEM 7 — Ravens ⌘K trigger: interim on-palette styling (HIGH)

The Ravens (⌘K) trigger currently renders as a **pink/magenta dot**, top-right, every route. Pink is off-palette and reads as a glitch.

**Interim fix (final art comes later):** make it a small circular button, rune-gold hairline border, `bg-bg-panel`, containing a simple **⌘K** label in IBM Plex Mono OR a minimal raven-silhouette SVG glyph in `text-text-muted` that goes `text-rune-gold` on hover. Subtle glow on hover only. It must read as an intentional affordance, on-palette, not a stray dot. Leave it swappable — Woody will replace the glyph with custom AI art.

## ITEM 8 — Top-left "Woody's Realm" rune mark: interim styling (HIGH)

Next to the "Woody's Realm" wordmark is a small rune glyph. Woody does not like the current yellow rune. Interim: render it smaller, in `text-text-muted` (not bright yellow), with a soft rune-gold glow only on sidebar hover — quiet, not loud. Keep it a single swappable component (`<RealmMark/>`) so Woody can drop custom AI art in later. Do not invent new art.

## ITEM 9 — Typography: kill Cinzel on small text (HIGH — locked-rule violation)

Memory card titles (and any other titles under 24px) currently use Cinzel. **Rule: Cinzel ≥24px only.** Audit every route. Any Cinzel instance under 24px → switch to Inter (the body font) at a confident weight (600) with appropriate tracking. Card titles should still feel like titles — just not in the display face. Also: memory card titles read like filenames (`SOLO-STORE-ART-STYLE-LOCK`) — if a human-readable `title` field exists in the data, use it; otherwise de-kebab and title-case for display.

## ITEM 10 — Remove the duplicate Activity panel on home (MEDIUM)

Home renders activity twice — "Dreaming Surfaces" (insight cards) and a terminal-style "Activity" panel. **Delete the terminal-style Activity panel.** Keep Dreaming Surfaces. `/activity` remains the full Heimdall view. Reflow the home grid so nothing leaves a gap.

## ITEM 11 — Number + label hygiene (MEDIUM)

- Heimdall "Today's Tally": `$0.0000` → `$0.00` (currency = 2 decimals everywhere; centralize a `fmtUsd`).
- "Realm Under Watch": `11:03 AM CDT → 12:03 PM EDT` mixes timezones. Pick one (Woody's local, America/Chicago) and use it for both ends of every range.
- KPI strip: number formatting is inconsistent ("121.2%", "6 healed", "1"). Standardize: the big number is the number; the unit/word goes in a small label beneath it. All three KPI cards follow the same template.
- "MCP STAT" panel: rename to "MCP SERVERS". De-duplicate (`tradingview` and `tradingview-mcp` both listed). If a connected/disconnected state is available, show a small status dot per chip; if not, leave the chips but fix the label and dupes.

## ITEM 12 — Mobile gate (MEDIUM)

At ≤640px the layout disintegrates (page ~12,000px tall, sidebar never collapses). Until a real responsive pass: at `≤640px` render a single centered panel — "Woody's Realm is built for desktop. Open on a wider screen." — on-brand, Norse copy. Hide the broken layout entirely below that breakpoint. (Full mobile comes later when Woody sets up remote access.)

## ITEM 13 — Home page polish + 21st.dev components (MEDIUM)

Implement the 3 approved components from `dashboard/docs/codex-briefs/21ST-DEV-INTEGRATION.md` (full specs there — BorderBeam, TracingBeam, ActivityRings) as part of this home-page polish:

- **BorderBeam** on the active agent's sidebar card — subtle traveling glow, agent accent color, respects reduced-motion.
- **TracingBeam** down the left gutter of the home page — makes the home read as one unspooling saga.
- **ActivityRings** — build the `DailyRitesPanel` (Body/Mind/Craft rings) it specifies, to replace one of the weaker home panels.

Then, broader home cleanup:
- Fix ragged card-row heights (Slate of Fates / System Health / Today's Watch must align — equal-height row).
- "Realm Under Watch": the decorative snowflake-glyph panel carries no information. Either give that panel real content or remove it and let the paired card go full-width.
- Apply the item-4 CTA rule: every primary button gold, red only for destructive/urgent. Audit the whole home page.
- "LATEST FORGING" headline currently renders a raw user prompt in Cinzel display. Cap its length, sentence-case it, and treat it as a *quote* (smaller, italic, with attribution) rather than a monument.
- Install deps the 21st.dev brief needs: `framer-motion`, `class-variance-authority` (CVA may already be present — check `package.json`). `framer-motion` is the only real add.

## ITEM 14 — Council model routing + ⚡ Supercharge toggle (MEDIUM)

Each Council agent has **two** models: a **Normal** model (its everyday default — cost-light) and a **Supercharged** model (max power, opt-in per summon). Implement both, plus the toggle.

| Agent | Role | Normal (default) | Supercharged (⚡) |
|---|---|---|---|
| Lebot James | All-Father · orchestration | **Claude — Sonnet** | **Claude — Opus** |
| Thor | Markets · trading | **Claude — Sonnet** | **Claude — Opus** |
| Perseus | DFS · ParlayBot | **DeepSeek — Chat** | **Claude — Opus** |
| Fenrir | Design · the Forge | **Claude — Sonnet** | **Claude — Opus** |
| Sauron | Research · all-seeing | **Gemini 2.5 Flash (free)** | **Claude — Opus** |

Mental model: **Supercharge always means Opus.** Normal is the agent's tuned default. One predictable toggle.

**The toggle:** add a small **⚡ Supercharge** switch to the council composer (next to the SUMMON button). Off = Normal model; On = Supercharged. It applies per-summon (does not persist sticky — defaults Off each new thread, so Opus is never burned by accident). When On, the cost estimate beside SUMMON updates and the "via …" line shows the Opus model.

**Implementation:**
- One config object — `lib/council-models.ts` — `{ [agent]: { normal: ModelRef, supercharged: ModelRef } }`. One-line editable.
- Surface the resolved model as the muted "via …" line on the agent page and composer, the way Thor's thread shows `via claude-cli claude-sonnet-4-6`.
- Respect the cost-aware triad: if the chosen model is capped/unavailable, fall back per the triad's existing rules and show the fallback in the "via …" line (e.g. `via claude-cli claude-opus → fell back: sonnet`).
- Do not hardcode model IDs in components — all references go through `lib/council-models.ts`.

---

## Report back

Write `dashboard/docs/codex-to-claude-review-refine-2026-05-25.md`: per-item what changed + files touched, the Token Burn data-source decision you made (item 3), before/after notes on the agent-page redesign, bundle-size delta from `framer-motion`, anything you chose to leave + why. Re-run the route audit table from the visual review and confirm zero `**markdown**` leaks and zero off-palette colors.

Begin with item 1.

=====

## Notes for Woody (not part of the Codex prompt)

- Items 1–4 are the real bugs the "polish pass" missed. 5 is your thread-scroll complaint. 6 makes the empty agents look intentional. 13 is the home glow-up with the 21st.dev components I'd already specced.
- **Item 14** is my recommended Council model mapping — Opus for Lebot (strategy), Sonnet for Thor + Fenrir (markets, design), DeepSeek for Perseus (numbers), free Gemini for Sauron (research). If you want to change any of them, it is one table edit before you paste — or tell me and I'll revise.
- Ravens symbol + top-left rune are styled neutral-on-palette for now (items 7–8). They stay swappable for the custom AI art we'll generate together.
- Run this tonight when your Codex window resets.
