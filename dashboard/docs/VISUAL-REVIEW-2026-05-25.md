# Visual Design Review — Woody's Realm AIOS Dashboard

**Reviewer:** Claude (lead designer)
**Method:** Playwright capture of every route at 1440×900 @2x + mobile 390px + scrolled bands. Console, page errors, and failed requests recorded per route.
**Scope:** Brutal full teardown. Nothing assumed good enough. Pixel-level.
**Verdict:** **This is a strong v0.7, not a finished product.** The bones are good — the panel system, the Norse copy, the gold-on-black discipline. But the "final polish pass" shipped real, visible defects as if they were done. Below is everything.

---

## 1. Route audit

| Route | HTTP | Console errors | Page errors | Failed reqs | State |
|---|---|---|---|---|---|
| `/` | 200 | 0 | 0 | 0 | Renders, real data |
| `/memory` | 200 | 0 | 0 | 0 | Renders, real data |
| `/activity` | 200 | 0 | 0 | 0 | Renders, real data |
| `/skills` | 200 | 0 | 0 | 0 | Renders, thin |
| `/skills/alfheim` | 200 | 0 | 0 | 0 | **Near-empty placeholder** |
| `/trading` | 200 | 0 | 0 | 0 | Renders, **raw JSON leak** |
| `/lebot-james` | 200 | 0 | 0 | 0 | Empty template |
| `/thor` | 200 | 0 | 0 | 0 | Has a thread; layout broken |
| `/perseus` | 200 | 0 | 0 | 0 | Empty template |
| `/fenrir` | 200 | 0 | 0 | 0 | Empty template |
| `/sauron` | 200 | 0 | 0 | 0 | Empty template |

Technically clean — zero console errors, zero failed requests, every route 200. That is the *only* thing the polish pass can fully claim. Everything below is visible to the eye and was missed.

---

## 2. Functional bugs shipped as "finished" — fix first

These are not taste. They are defects.

**B1 — Markdown is not rendered. Raw `**asterisks**` are on screen in three places.**
Dreaming Surfaces (home), the Activity panel (home), and Heimdall's Watch (`/activity`) all print literal text like `You called \`Skill\` **84** this week`. The `**…**` shows as asterisks. The insight strings carry markdown; the components render them as plain text. Three surfaces, same bug. A polish pass that "audited every panel" cannot miss this.

**B2 — Token Burn numbers are nonsense.** Home shows `CLAUDE — 2261.7M tokens today` — 2.26 *billion* tokens — with the bar pinned at 100% and `≈ $1591.20 list-price value`. Root cause in `components/TokenBurnMeter.tsx`: `claudeTokens` sums `in + out + cache_read + cache_write`. Cache-read tokens dwarf real tokens ~100×, so the figure is meaningless. The denominator `CLAUDE_DAILY_WINDOW_TOKENS = 25_000_000` is an invented number, so the bar is *always* clamped to 100% and conveys nothing.

**B3 — Heading contradicts its own data.** The panel title is `LAST 5H WINDOW`. Every number under it says `tokens today`. Pick one.

**B4 — `/trading` leaks raw JSON.** The "Latest Slate" card dumps `[{"player":"Brandon Nimmo","stat":"batter_hits"...}]` — an unformatted JSON blob — straight into the UI. This is the single most unfinished thing on any route.

**B5 — `$0.0000`.** Heimdall's "Today's Tally" shows DeepSeek spend with four decimal places. Currency is two.

**B6 — Timezone mixing.** "Realm Under Watch" prints `Thu, 11:03 AM CDT → Thu, 12:03 PM EDT`. One range, two timezones.

**B7 — Mobile is completely broken.** At 390px the page is **~12,300px tall**. The sidebar never collapses; content is crushed into a vertical sliver beside a black void. If the dashboard is desktop/Obsidian-only, the mobile route should be gated or given a deliberate stacked layout — not left to disintegrate.

---

## 3. Brand failures — the aesthetic does not hold

The locked brand is **painterly MTG Theros × Supergiant Hades**. The dashboard breaks its own #1 rule.

**A1 — The hero image is a literal stock PHOTOGRAPH.** Above the fold, on the home page, the most prominent element is a photo of a Greek temple under a bright blue cloudy sky. Not painted. A photograph. It instantly reads as a template with a stock image dropped in. This one element undoes the brand harder than anything else on the site.

**A2 — Lebot James' agent hero background is a faded photo of LeBron James.** A real basketball photograph behind a Norse all-father. Same crime as A1.

**A3 — The Ravens (⌘K) trigger is a pink/magenta dot, top-right, every route.** Pink is not in the OKLCH palette. It reads as a CSS glitch, not an affordance. Either no one knows it's a button or everyone thinks the page is broken.

**A4 — AmbientEmbers is invisible.** `components/AmbientEmbers.tsx` is `fixed inset-0` + `hidden motion-safe:block`. It does not register in a single screenshot. Either it is not working or it is so subtle it is dead weight.

---

## 4. Typography — the display face is mishandled

**T1 — Hero headline leading is crushed.** "STRENGTH TO YOU, LORD WOODY" wraps to two lines and "LORD" / "WOODY" nearly collide. Cinzel display needs generous line-height; it has almost none.

**T2 — Cinzel on small text — direct violation of the locked rule.** Memory card titles (`SOLO-STORE-ART-STYLE-LOCK`, `OBSIDIAN-VAULT-STRUCTURE`) are ~14–16px Cinzel all-caps. The rule is **Cinzel ≥24px only**. Small Cinzel is cramped and hard to scan. It also makes every card title read like a filename, not a title.

**T3 — Hero text has no scrim.** Gold headline crosses bright clouds with no overlay dark enough to hold contrast. Half the headline is hard to read.

---

## 5. Layout — too many empty black columns

**L1 — Agent pages are hollow.** `/lebot-james`, `/perseus`, `/fenrir`, `/sauron` render a 4-column layout (nav · Past Sagas · center · Scrying Pool) where, with no data, three of four columns are empty black with "No councils yet" / "Mímir does not know that yet." The page is mostly void.

**L2 — Realm pages are placeholders.** `/skills/alfheim` is two small cards followed by ~70% empty black. Every realm page is like this. It looks unfinished because it is.

**L3 — Thor's thread wastes half the width.** On `/thor` the message column floats with a large black void to its left. Content does not use horizontal space.

**L4 — "Realm Under Watch" row is unbalanced.** A text-and-button card sits beside a panel containing only a decorative gold snowflake glyph floating in black. The glyph carries zero information.

**L5 — Ragged card heights.** The Slate of Fates / System Health / Today's Watch row has three different heights and ragged bottoms.

**L6 — Yggdrasil hotspots are undiscoverable.** The 9 realm links are tiny colored dots scattered on the tree image — indistinguishable from painterly bokeh, unlabeled, hover-only. A first-time viewer cannot tell the tree is interactive.

---

## 6. Content, redundancy, and copy

**C1 — Activity data is rendered three times.** "Dreaming Surfaces" panel + "Activity" panel on the home page + the entire `/activity` route all show the same recurring-task insights. Two of them are on one screen, in two different visual treatments (card list vs terminal log).

**C2 — "MCP STAT" is a flat tag dump.** Wrong label (should be STATUS or SERVERS). It is a wall of identical gray name chips with no connected/disconnected state. `tradingview` and `tradingview-mcp` are both listed — a duplicate.

**C3 — CTA color has no rule.** "OPEN TASK" is red, "OPEN SLATE" is gold, "SUMMON" is gold. Red (blood) and gold both do CTA work with no logic. Pick a primary action color.

**C4 — KPI numbers format inconsistently.** "121.2%" / "6 healed" / "1" — one bakes a unit word into the giant number, the others don't.

**C5 — Sidebar footer mini-grid is debug output.** The `8H P9 E3 FC / C7 FA 38 T9` cell grid has no legend and reads like a memory dump.

**C6 — The "Latest Forging" headline is a raw user prompt.** "DO A MIX OF CAPTAIN AND GUILD MASTER BUT MAKE IT VERY GOOD" rendered as a grand Cinzel display title. Verbatim input dressed as a monument.

---

## 7. What is genuinely good (so it survives the fixes)

- The OKLCH gold-on-rich-black palette is disciplined and handsome where photos don't intrude.
- The `panel` utility gives consistent borders/radius across cards.
- The Norse voice ("Speak it, my Lord", "Fenrir Growls", "Mímir does not know that yet") is characterful and consistent.
- Asymmetric 62/38 grids are used on Heimdall and elsewhere — correct instinct.
- Zero console errors and zero failed requests across 11 routes is real engineering quality.

---

## 8. Priority-ranked fix list

| # | Fix | Severity |
|---|---|---|
| 1 | Render markdown in insight strings (B1) | CRITICAL — visible bug |
| 2 | Replace the hero stock photo with painterly art (A1) | CRITICAL — brand |
| 3 | Fix Token Burn math + drop the fake window denominator (B2/B3) | CRITICAL — wrong data |
| 4 | Format the `/trading` Latest Slate JSON into readable rows (B4) | CRITICAL — unfinished |
| 5 | Replace Lebot James photo background (A2) | HIGH — brand |
| 6 | Fix hero headline leading + add a scrim (T1/T3) | HIGH |
| 7 | Restyle the Ravens ⌘K trigger on-palette (A3) | HIGH |
| 8 | Remove Cinzel from small card titles (T2) | HIGH — locked-rule violation |
| 9 | Give realm + empty agent pages real content or a designed empty state (L1/L2) | HIGH |
| 10 | De-duplicate activity surfaces on home (C1) | MEDIUM |
| 11 | `$0.0000` → `$0.00`, single timezone (B5/B6) | MEDIUM |
| 12 | One CTA color rule (C3) | MEDIUM |
| 13 | MCP panel: rename, add status, de-dupe (C2) | MEDIUM |
| 14 | Yggdrasil hotspots: label them, make them obvious (L6) | MEDIUM |
| 15 | Mobile: gate it or design a stacked layout (B7) | LOW (if desktop-only) |

---

*Screenshots archived at `c:/tmp/dashboard-review/`. Re-run via `node c:/tmp/dashboard-review/shoot.js`.*
