# Slice 1 Critique

## 1. Right amount of hardening — with one small refinement left

Slice 1 hit the right targets: fonts, tokens, error boundaries, stat row cleanup, nav demotion. **One thing missing before Slice 2:** Cinzel is loaded via `next/font` but not yet *constrained*. From my prior critique, the rule was "Cinzel ≥24px only." Without an explicit guard, it'll leak into card labels and stats the moment a component is built in a hurry.

Add this small rule now, in `styles/tokens.css` or a typography utility, before Trading lands:

```css
/* Cinzel is display-only — minimum 24px */
.font-display { font-family: var(--font-cinzel); font-size: max(1.5rem, 1em); }
body, button, input, label, .text-stat, .text-label { font-family: var(--font-sans); }
```

Also: `error.tsx` is at the root only. Add segment-level `error.tsx` files for `/api`-backed routes when those routes get real payloads — not blocking for Slice 2, but flag it.

Everything else: ship Slice 2. Don't pile more shell work.

## 2. Slate of Fates / Today's Rites

- **`Slate of Fates`** — **keep.** Rare case where the Norse pun lands on operational jargon: "slate" is real trading language, "Fates" (Norns) is the mythological hook. Two-layer reading. This is the *one Norse moment* I argued for earlier — let it carry weight.
- **`Today's Rites`** — **change.** "Rite" is ceremonial; tasks are operational. Drifts straight into themed-not-premium territory and dilutes the Slate moment. Two options:
  - **Recommended:** `Today's Watch` — echoes Heimdall, stays ops-coded, scannable.
  - **Plainest:** just `Today` or `Up Next` — zero theme tax.

Pick `Today's Watch` if you want the Norse continuity; `Today` if you want maximum scannability. Either beats `Rites`.

## 3. REALM cluster — hide it

**Hide entirely in v1.** A nav item that lands on a placeholder is a broken promise rendered every render. Even at low emphasis, `Yggdrasil` / `Mimir's Well` / `Heimdall's Watch` add three click-targets that go nowhere — friction every glance, and they reinforce "this product is unfinished" exactly as my earlier critique warned.

Roadmap signal for *you* lives in `BATON.md` and `docs/`, not the live shell. Bring each REALM route back the same day its page becomes real. Reintroducing nav items is 30 seconds of work; living with dead ones for weeks is a quiet UX tax.

If you want a soft middle ground: a single collapsed `+` "Coming" disclosure footer in the sidebar. But honestly — just delete them from nav until they ship.

## 4. What Codex does next — before/during Slice 2

In order, before any Trading code:

1. **Lock Cinzel ≥24px** (CSS rule above) — 5 minutes.
2. **Hide REALM cluster** — 2 minutes.
3. **Rename `Today's Rites`** to `Today's Watch` or `Today` — 2 minutes.
4. **Write the panel contract first** (this is the real Slice 2 prep): in `docs/PANEL-CONTRACT.md`, define the typed adapter every home-screen panel must satisfy:

   ```ts
   type PanelSignal = {
     freshness: { iso: string; staleAfterMs: number };
     headline: string;            // ≤80 chars, one line, no markdown
     nextAction: { verb: string; href: string; hotness: 0 | 1 | 2 | 3 };
     source: { kind: 'fs' | 'sqlite' | 'http'; path: string };
   };
   ```

   Then write `lib/trading.ts` against that contract — not the old loose-match shape. This is the single architectural decision that keeps every future panel honest. Don't skip it.

5. **Then build Slice 2:** Trading adapter → `PanelSignal` → updated `TradingPanel` consuming the contract → one real `nextAction` button wired to open the source artifact.

Do **not** refactor the home composition (asymmetric 62/38 + 2/1/1) in Slice 2. That's Slice 3, after Trading earns its weight. Sequencing matters — refactoring the grid around a still-mocked Trading panel will produce the wrong grid.

---

**Verdict:** Slice 1 is accepted. Three 10-minute cleanups + the panel contract doc, then Slice 2 = Trading against the contract. Don't touch home IA yet.
