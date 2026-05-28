# Slice 2.5 Critique — Trading Route

**Verdict: Accepted. Codex is clear to proceed to Slice 3.** One small adapter cleanup and one small page hygiene fix that can be done inline with Slice 3, not blockers.

---

## What's right

- **`isFresh` moved into the adapter, contract updated.** Fix #2 from the prior critique is fully resolved. `lib/adapters/trading.ts:139` computes once, render reads the flag. This survives ISR/caching cleanly. Lock the contract.
- **`/trading?focus=parlay|brief` exists, the buttons go somewhere real.** Fix #1 resolved — no more raw-JSON product surface.
- **`/api/trading/raw` retained as a dev surface only.** Correct call; debug seam without polluting the product path.
- **Adapter still honest** — real SQLite, real mtime, no synthetic timestamps. PARLAY hotness 2, BRIEF hotness 1 — correct hierarchy.

## Two small things, not blockers

1. **`getTradingDetail()` calls `readLatestBrief()` and `readLatestParlay()` twice** — once via `getTradingCards()` (lines 215), once directly (216–217). Cheap reads, but it's the redundancy the observation log flagged. Refactor to a single internal `loadSources()` that both `getTradingCards` and `getTradingDetail` consume. Five lines. Do during Slice 3.

2. **`app/trading/page.tsx:76` reads the brief file inside JSX via dynamic import.** Functional but ugly — file I/O should resolve in the server component body, not in the render expression. Move the `readFile` into the adapter as `latestBrief.content` (already have the path; load it once when `getTradingDetail()` runs). Removes the inline `await (await import(...))` smell.

Neither needs a Slice 2.6. Fold into Slice 3's first commit.

---

## Answers to your three questions

### 1. Is `/trading` sufficient as the destination the home card needed?

**Yes.** The home card now has somewhere honest to point. That was the entire blocker. The page is plain — that's fine; it's a destination, not a product surface. Premium happens at home; `/trading` is the workshop. Don't gold-plate it before Slice 3.

The one thing that already reads as a tone violation: **the focus toggle as two pill buttons at the top is louder than the page content underneath**. In Slice 3+ polish, fold the focus switch into the signal list itself — clicking a card in the left column *is* the focus action. No separate toggle row.

### 2. Format `legs_json` into a table, or ship the raw detail?

**Ship raw. Move on.** Legs tables are a `/trading` polish task, not a home-composition prerequisite. Slice 3 doesn't read `legs_json`; it reads the card. A formatted legs table belongs in a "Trading page polish" slice after the home grid is real, when you can see how often users actually land there and what they actually need to see.

The brief content rendering has the same answer — preformatted `whitespace-pre-wrap` is fine for v1. Markdown rendering is a separate concern.

### 3. Signal list beside focused detail, or collapse?

**Collapse aggressively, but not yet.** Today the side-by-side is harmless because there are two cards. The moment Doctor or Tasks cards land in this list (they shouldn't — `/trading` should only show trading signals), or the moment a slate has 6 entries, the dual-column layout becomes noise.

The right model for `/trading`: **one column, signals stacked as expandable rows, the focused one expanded inline.** No separate detail pane. But that's a redesign, not a Slice 3 prerequisite.

For now: keep the two-column layout, **but make the left column show only the focused source's signal**, not all signals. Currently the user clicks "Brief" and still sees the PARLAY card in the left list — that contradicts the focus model. Either filter the left list by `focus`, or remove the left list entirely on `/trading` and put the signals back on home where they belong.

---

## Clear to proceed to Slice 3?

**Yes. Build:**
- Pulse strip
- Next Action card (use the existing hotness ranking — `PanelSignal.nextAction.hotness` is already the input)
- Session glyph
- 62/38 + 2/1/1 asymmetric grid (Trading wins the 2x by default; revisit when Doctor/Tasks migrate)
- Activity stream

**Carry forward into Slice 3's first commit:**
- Consolidate the duplicate source reads in the adapter
- Move brief file read out of JSX into adapter
- Filter `/trading` left-column list by `focus` param

**Defer to a `/trading` polish slice after Slice 3 lands:**
- Formatted legs table
- Markdown brief rendering
- Collapse focus toggle into the signal list itself

Tight loop: Slice 3 home composition, then `/trading` polish, then open positions. Don't let Trading page perfectionism delay the asymmetric grid — that's the headline visual of v1.
