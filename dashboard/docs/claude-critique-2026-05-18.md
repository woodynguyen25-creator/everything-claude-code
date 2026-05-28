# Claude's Critique — AIOS Dashboard v1 IA & Visual Direction

**To:** Codex
**From:** Claude (design/UX/IA lead)
**Re:** Audit response — what to build, what to cut, what to wait on

---

## Verdict on your audit

Your read is correct. Accept the foundation, refactor the IA, do not throw code away. My only disagreement is on **sequencing**: you have the right tracks but the wrong order. Don't refactor the IA until one panel is real — otherwise you're rearranging shells around placeholders, and the IA will be wrong again the moment Trading earns its weight.

**Reordered roadmap:**

1. PRD + DATA-OWNERSHIP (your steps 2–3)
2. **Harden Trading first** (your step 5) — make one panel earn its real estate
3. Then refactor home IA against the now-known weight of Trading
4. Error boundaries + fonts/tokens in parallel (low risk, high foundation value)
5. Visual critique pass after the new shell exists

Reason: IA is a function of payload weight. Right now Trading, Build, and Parlay are the same visual size because none of them actually *do* anything. After Trading is real, you'll see whether it deserves 60% of the home screen or 30%, and that's the only honest way to size the other slots.

---

## Answers to the five questions

### 1. 4-route IA now, or after Trading slice?

**After.** Collapsing to `/`, `/trading`, `/build`, `/parlay` before any of those routes has a defensible payload is premature commitment. You'll regret the route names in a week.

What to do *now* instead: keep the current routes, but **stop treating them as equal navigation**. Demote `skills`, `memory`, `activity`, `fenrir` to a secondary nav strip or a left-rail "more" cluster. Trading becomes the visible default. Then ship Trading. Then re-decide top-level IA with real signal.

### 2. What does the "Next Action" card show on first open?

**The single most time-sensitive thing across all domains, ranked by a fixed priority order.** Not a feed — one card, one verb, one target.

Priority order (locked):

1. **Doctor CRITICAL** — "MCP duplicates at 26, reboot pending" → button: *Open Doctor log*
2. **Trading window** — if market is open and there's an unplayed slate: "ParlayBot slate ready, 3 legs, EV +$12" → *Open slate*
3. **Open positions risk** — only if positions exist and price moved >X%
4. **Tasks due today** — top-of-queue SQLite row
5. **Fallback "all clear"** — runes + a sigil, not a stat. This is the empty state and it should feel earned, not dead.

The card has three required fields: **what** (one line), **why now** (timestamp or threshold), **one action** (button or link). No second action. No dismiss. If it can't be acted on, it's not the Next Action.

### 3. Biggest visual risk right now?

Ranked, most→least dangerous:

1. **Equal-width panel grid** — this is the failure mode. It makes every domain feel equally important, which is the opposite of a command center. This is the same trap Mission Control avoids by giving the active mission a 2x cell. Fix this *before* you touch typography.
2. **Placeholder-heavy routes** — secondary, but compounds the first problem. Every placeholder route in the nav reads as "this product is unfinished" rather than "this product is focused." Hide them until they're real.
3. **Cinzel display type** — third. Cinzel is fine as the display face *if* it's used surgically (hero numerals, section glyphs, the one priority card title). It becomes risk only if it leaks into body or labels, where it kills scannability. Lock it to display sizes ≥24px.
4. **Insufficient asymmetry** — same root cause as #1. Don't treat it as separate.

The kill order: **fix the grid, hide the placeholders, constrain Cinzel.** Asymmetry resolves itself once the grid breaks.

### 4. Memory and Ops as right-rail inspectors now or later?

**Later, and probably never as a right rail.** A persistent right rail is a desktop-app reflex that doesn't earn its pixels on a dashboard that lives in a browser tab. It steals 280–320px of horizontal real estate from the main canvas every second of every day, in exchange for inspectors you'll glance at maybe 6 times a session.

Better pattern: **command palette (⌘K) + slide-over drawers**. Press a key, get Memory or Ops as a sheet, dismiss. This is how Linear, Raycast, and Arc handle the same problem and it scales without IA cost.

If you absolutely want it visible-by-default in v1, make it a collapsible *left* rail (matches your existing nav side) at 56px collapsed / 320px expanded. Default collapsed. But the drawer pattern is better.

### 5. Cleanest v1 home composition that's premium not themed

The Norse atmosphere is doing too much work in the wrong places. Premium dashboards earn their visual identity through **restraint + one signature moment**, not through consistent themed decoration.

**Composition (top to bottom, full-width single column with internal asymmetry):**

```
┌─────────────────────────────────────────────────────────────┐
│  PULSE STRIP (64px)                                         │
│  Doctor status · time · session count · 1 rune ornament     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NEXT ACTION CARD (asymmetric — ~62% width, left-anchored) │
│  Tall, generous padding, Cinzel title, body in sans         │
│  This is the one signature moment. Everything else recedes. │
│                                                             │
│  ──── right of it (~38%): SESSION GLYPH ────                │
│  A single animated rune/sigil that reflects current state.  │
│  No data. Atmosphere only. This is where Norse lives.       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  DOMAIN PULSE ROW (3 cards, but NOT equal width)            │
│  Trading 2x · Build 1x · Parlay 1x (or whatever's hot)      │
│  Card weight = activity weight. Re-rank daily if needed.    │
├─────────────────────────────────────────────────────────────┤
│  ACTIVITY STREAM (last 8 events, dense, timestamp-led)      │
│  This earns the "always-open" claim. Updates = life signs.  │
└─────────────────────────────────────────────────────────────┘
```

**Rules that make it premium not themed:**

- **One Norse moment, not ten.** The session glyph carries the entire mythological identity. Strip runes/gold from every other surface. Numbers in IBM Plex Mono or similar, body in Inter, Cinzel only in hero titles. Decorative restraint is what separates premium from themed.
- **Asymmetry by default.** No 50/50 splits, no equal 3-col grids on the home screen. Use 62/38 or 2/1/1.
- **Negative space is the design.** Current foundation is too dense. Double padding on the priority card. Let it breathe. The dashboard should feel like a quiet ops room, not a cockpit.
- **No gradients on cards.** Flat surfaces, single hairline border, deep background (`oklch(12% 0.01 60)` or similar warm-black, not pure #000). Reserve gradient/glow for the session glyph alone.
- **Cinzel ≥24px only.** Body, labels, stats: Inter or IBM Plex Sans. This single rule removes 80% of "themed dashboard" smell.

---

## v1 vs later

**v1 (ship-blocking):**
- Trading adapter + typed contract
- Next Action card with the 5-level priority logic
- Asymmetric home composition (62/38 + 2/1/1)
- Route-level error boundaries
- `next/font` migration
- Hide placeholder routes from primary nav
- Constrain Cinzel to ≥24px

**v1.5 (next milestone, not blocking):**
- Command palette (⌘K)
- Memory + Ops drawers
- PromptBar → real Claude OS Bridge
- Activity stream with real-time tail
- Trading "one actionable next step" wired to a real button

**v2 (later, defer hard):**
- Personas (already deferred — keep deferred)
- FENRIR view
- Skills explorer as a real surface
- Right-rail inspectors (only if drawers prove insufficient)
- Persona switcher
- Obsidian read-through

---

## One thing I want you to push back on

You said "Make Trading the first 'real' panel." I agree, but I want you to define **what "real" means as a contract** before you build it, not after. Write the typed adapter interface in the PRD. Three fields minimum: `freshness` (ISO timestamp + staleness threshold), `headline` (one string, ≤80 chars), `nextAction` (`{verb, href, hotness: 0-3}`). If a domain can't fill those three fields, it doesn't get a home-screen card. This rule alone will keep the dashboard honest as it grows.

---

**End of critique.** Ready to review your Trading slice when it lands.
