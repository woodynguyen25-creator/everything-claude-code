# Slice 2 Critique — Trading Signal Contract

**Verdict:** Accepted with two small corrections. The contract is right, the adapter is honest, the panel renders real data. Don't pile on. Wire one real `/trading` route, then move to Slice 3.

---

## What landed well

- **`PanelSignal` is the right shape.** Four fields, `nextAction: null` allowed, source typed to `'fs' | 'sqlite' | 'http'`. This will hold up across Doctor and Tasks without modification. Lock it.
- **Adapter is honest.** Real SQLite read, real filesystem mtime, no synthetic timestamps. The `headline.slice(0, 80)` enforcement at adapter level (not just in docs) is the kind of contract enforcement that actually survives.
- **Sort by hotness then freshness** is the correct default. Don't let this drift to user-configurable sorting in v1.
- **`getTradingRaw` separation** from `getTradingCards` is good — debug surface stays out of the display path.

## Two corrections before Slice 3

1. **`Open slate` / `Open brief` route to `/api/*/raw` — that's a debug seam, not a product action.** A user clicking "Open slate" lands on raw JSON. That's worse than no button. Either (a) demote `hotness` to 0 and label them `Inspect` until real pages exist, or (b) build the minimal `/trading` route now (see extra question below). Don't ship raw-JSON buttons with hotness 2 — it teaches the user that the bright button leads to garbage.

2. **`isFresh` runs at render time on a server component but the component is rendered once per request.** Today that's fine. The moment you add ISR or any caching layer, a 3-hour-old card will read as "fresh" forever. Compute `isFresh` inside the adapter, return it on the card, kill the client-side `Date.now()`. Five-minute change. Future-proofs the freshness contract.

---

## Answers to your four questions

### 1. Does Trading deserve the 2x slot in 2/1/1?

**Yes — but conditionally.** Trading deserves 2x **when it has a fresh PARLAY card with hotness ≥ 2**. Otherwise it's just two stale-ish reference links and Build/Parlay/Doctor may have hotter signal. The composition should be **payload-weighted, not domain-weighted** — that's the whole point of the panel contract.

Implementation: in Slice 3, the home composition reads the top card across all panels by `hotness × freshness`, and that domain gets the 2x slot. Today Trading wins because PARLAY is hot and BRIEF is recent. Tomorrow Doctor might win because MCP duplicates spiked. The grid should reflect that — that's the command center promise.

If you don't want that dynamism in v1, fine — give Trading the 2x as the **default** because it's the only domain currently meeting the contract, and revisit when Doctor and Tasks are migrated.

### 2. Both cards visible, or elevate one?

**Elevate PARLAY, demote BRIEF.** Two reasons:

- **PARLAY is an event** (EV +121.2%, time-windowed, actionable). **BRIEF is a reference** (read-when-convenient context). Different temporal weight — they shouldn't render at equal visual weight.
- The Next Action priority logic (from my prior critique) already says "trading window with unplayed slate" outranks "morning brief exists." Honor that hierarchy inside the panel itself, not just at the home level.

Concrete: PARLAY gets the full card treatment (current size, hotness-2 button). BRIEF collapses to a single line under it — `BRIEF · Fri May 15 · Pre-Market Brief →` — clickable, no separate detail row, no separate freshness dot. One signal, one shadow.

### 3. Raw debug actions for one more slice, or build `/trading` first?

**Build `/trading` first.** See extra question below. Raw JSON buttons in a "premium not themed" dashboard are a tone violation — they advertise "we haven't finished this." A minimal `/trading` page (just the slate detail + brief markdown render) is 2–3 hours, and unblocks Slice 3 to design home composition against a real destination.

### 4. Current density right, or calmer/more premium before Slice 3?

**Calmer, in three specific ways:**

- **Drop the source-label + freshness-dot + timestamp row.** That's three meta-data atoms above every headline. Collapse to one: a small right-aligned timestamp with a freshness-tone color (`fresh` = no chip, `stale` = an amber dot inline). The `PARLAY` / `BRIEF` label can move into the headline prefix or disappear entirely once cards differ visually.
- **`{n} signals` count in the header is filler.** Remove. The cards are right there.
- **`Slate of Fates` is doing the right work — let it.** Don't add a tagline, don't add a subhead. That title is the one Norse moment for this panel; protect its silence.

Current density isn't loud — it's just over-labeled. Premium reads as *fewer marks per signal*, not smaller marks.

---

## Extra question: Slice 3 or `/trading` route first?

**`/trading` first.** Three reasons:

1. **You'll size the home grid wrong without it.** Slice 3 is asymmetric composition — 62/38, 2/1/1. The 2x Trading slot is supposed to *preview* a destination, not *be* the destination. If `/trading` doesn't exist, the home card has no honest demote path ("see all" → where?). You'll end up making the home card try to do too much, which defeats the asymmetry entirely.
2. **It unblocks the raw-debug-button problem cleanly.** Two days of pretending those buttons are real is two days of bad muscle memory and one screenshot you don't want in the portfolio.
3. **`/trading` is the cheapest possible domain page** — you already have the adapter, you already have the cards. The route is `app/trading/page.tsx` that calls `getTradingCards()` and renders the slate + brief in a generous single-column layout. No new data layer. Maybe 150 lines.

**Scope for the interstitial slice (call it Slice 2.5):**
- `app/trading/page.tsx` — full slate detail (legs table from `legs_json`) + brief markdown render
- Move `Open slate` / `Open brief` to `/trading?focus=parlay` / `/trading?focus=brief`
- Kill `/api/trading/raw` from product surface (keep for dev)
- Compute `isFresh` in adapter (fix #2 above)
- Collapse BRIEF to one line (answer #2 above)

**Then Slice 3** — Pulse strip, Next Action card, Session glyph, 62/38 + 2/1/1, Activity stream — built against a Trading panel that actually has somewhere to point.

---

**End of critique.** Tight loop: Slice 2.5 (`/trading` + adapter polish) → Slice 3 (home composition). Don't skip the interstitial; the home grid needs a real destination to compose around.
