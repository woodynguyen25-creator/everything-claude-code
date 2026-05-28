# Slice 3 Critique — Home Composition

**Verdict: ACCEPTED as the new home baseline.** Codex shipped the full composition cleanly. The dashboard now has a real shape, not a placeholder. Next move is **Doctor/Tasks contract migration** with a small polish pass running alongside.

---

## What's right (substantive)

1. **NextActionCard is the strongest piece.** Full 5-level priority logic implemented exactly to spec — Doctor crit → open critical task → trading slate within 15min market-open lock → Doctor warn + >24h staleness → all-clear with the ᚨ Ansuz rune. The NYSE-time market-open check is properly weekday-filtered and timezone-aware. Hotness-driven button tone (`blood / ember / rune-gold`) reads right.
2. **realm-status.ts logic is locked correctly.** `storm = Doctor crit OR deferred>0` / `watch = warn OR critical task` / `ok = otherwise` — matches the spec. Used consistently across HeroBand, PulseStrip, NextActionCard, and SessionGlyph (for the critical red-eye motif).
3. **PulseClock has real dual-timezone + market-state logic.** Chicago + Eastern + market-state derived from NYSE schedule (pre-market 4am-9:30am, regular 9:30-4pm, extended 4-8pm). 60s client update. This is a finished surface, not a placeholder.
4. **mode.ts has deterministic date-seeded quote rotation** — same quote for the whole day, different quotes day-to-day. Correct pattern.
5. **ActivityStream format** is exactly the dense terminal-ish look that was locked: `[7:14am] DOCTOR  NPX cache healed` — JetBrains Mono, tight leading, lowercase timestamp, uppercase domain in rune-gold. Empty state copy is identical to spec.
6. **TodaysWyrd badges** use the locked palette mapping (bifrost on-track, iron paused, ember next, blood blocked).
7. **DomainRow grid is asymmetric** as specced (`grid-cols-[2fr_1fr_1fr]`) — no equal-width grid anywhere.
8. **Slice 2.5 cleanups carried forward** — `isFresh` is adapter-side, brief file read is out of JSX, `/trading` list filtered by `focus`. All three carry-forwards landed cleanly.

---

## What needs attention (rank-ordered)

### 1. **Realm status is duplicated** — HeroBand line 58 AND PulseStrip line 18 both show the realm label
   - **Fix:** Drop `realm.label` from HeroBand. Keep it in PulseStrip only.
   - **Rationale:** Hero is for *mood + greeting + identity*. PulseStrip is for *operational status*. They should never overlap. Right now the user sees "Realm at peace." twice within 80px of vertical space.
   - **Surgical edit:** Remove HeroBand.tsx line 58 (`<p className="mt-2 text-base text-text-primary">{realm.label}.</p>`) and drop the realm fetch from line 38 (Promise.all becomes just `getModeContext()`).

### 2. **profile.json is missing schedule + birthday data Woody locked**
   - Current state: only `work.days = [1,2,3,4,5]`. Missing: `work.start = "15:00"`, `work.end = "19:00"`, gym schedule.
   - **Fix:** Fill in:
     ```json
     "schedule": {
       "work": { "days": [1,2,3,4,5], "start": "15:00", "end": "19:00" },
       "gym":  { "preferred": "morning", "target": "daily" }
     }
     ```
   - Birthday stays `null` — Woody fills when ready.
   - **Why it matters:** Future "at work" mode (3-7pm M-F) and "gym time" greeting variations depend on this data.

### 3. **PulseClock separator inconsistency** — line 67 uses `-` between Eastern time and market state, breaking the bullet-separated pattern
   - Current: `Sat 11:50 PM CDT · 12:50 AM EDT - market closed`
   - **Fix:** Change `- ${now.market}` to `· ${now.market}`. One-character edit.

### 4. **NextActionCard body could breathe slightly more**
   - Current: `text-sm leading-7` body
   - **Suggest:** `text-base leading-7` — promotes the explanatory line so it feels like a real hero body, not a caption. The card's job is to dominate the row; the body needs presence.

### 5. **DomainRow lacks mobile fallback**
   - Current: `grid gap-6 lg:grid-cols-[2fr_1fr_1fr]` — collapses to single-column below `lg`.
   - **Suggest:** Add `md:grid-cols-2` so Trading goes full-width and Doctor + Tasks share a row on tablets. Single-column is too tall on narrower widths.
   - Low priority — Woody opens this on desktop primarily.

### 6. **Dead code in NextActionCard actionTone()**
   - Line 16's `hotness === 0` branch returns styling, but the `state.action ? ...` check at line 104 means the function never runs when action is null. Either remove the hotness-0 branch or remove the gating (and let the function handle null actions cleanly). Tiny cleanup.

### 7. **`void year;` in mode.ts line 82**
   - Code smell suppressing an unused destructured variable. Use `const [, month, day] = profile.birthday.split('-').map(Number);` to skip year cleanly.

### 8. **HeroBand date typography**
   - Current: `text-sm text-text-secondary` — date reads as small caption
   - **Optional:** Could promote to `text-base text-text-primary` for more authority. Currently feels timid relative to the Cinzel hero greeting.

---

## Answers to Codex's 7 questions

| # | Question | Answer |
|---|---|---|
| 1 | Hierarchy right, or section too loud/weak? | **Mostly right.** One issue: realm status duplicated in HeroBand + PulseStrip. Drop from HeroBand. Everything else holds. |
| 2 | PulseStrip stay separate? | **Yes, keep separate.** Hero = mood/greeting. Pulse = ops state. Don't merge. The 64px strip works exactly as designed. |
| 3 | Today's Wyrd position? | **Stays where it is** (between NextAction row and DomainRow). It bridges "what should I do" (above) with "what's the state" (below). Natural reading flow. |
| 4 | NextActionCard dominant enough? | **Yes — 62% width + Cinzel ≥24px headline + generous padding works.** Only suggestion: bump body to `text-base` so the explanatory line carries more weight. |
| 5 | SessionGlyph restrained enough? | **Yes — perfect v1 placeholder.** Single radial backdrop, one SVG, 12s slow rotation, rune-glow on inner runes, critical-state red-eye correctly wired. Approve as-is. This swaps to the cyborg LeBron Midjourney art when that render lands. |
| 6 | 2/1/1 DomainRow survives? | **Yes for now**, but it's a temporary truce. Doctor + Tasks aren't `PanelSignal` consumers yet — they look weaker than Trading because they don't have proper card structure. After the migration, revisit whether 2/1/1 still feels right or whether all three should equalize. |
| 7 | ActivityStream dense enough? | **Yes — 12 events, mono, terminal-ish but readable.** Not noisy. Format is the locked spec exactly. |

---

## Next 3 implementation priorities (in order)

### Priority 1 — **Doctor + Tasks `PanelSignal` contract migration** (~half day)
**Biggest architectural unblock for v1.5+.**

- Migrate `DoctorPanel.tsx` to consume `PanelSignal[]` shape (same as `TradingPanel`)
- Migrate `TasksPanel.tsx` same way
- Both panels need: `freshness` (last Doctor run / last task update), `headline` (`11 healed · 0 deferred` / `3 tasks open · 1 priority`), `nextAction` (`Open Doctor log` / `Open priority task`)
- Unlocks: uniform staleness handling across all three home panels, per-panel "Ask {agent}" buttons later (v1.5), structured events feeding ActivityStream more cleanly

### Priority 2 — **Slice 3 polish pass** (parallel commits to Priority 1, ~2-3 hours total)
Land these as small atomic commits while the contract migration is in flight:

- Drop `realm.label` from HeroBand (deduplicate from PulseStrip)
- Fill in `profile.json` work hours + gym schedule
- Fix PulseClock `-` → `·` separator
- Bump NextActionCard body to `text-base`
- Clean up `actionTone` hotness-0 dead branch + `void year` smell
- Promote HeroBand date typography to `text-base text-text-primary` (optional)
- Add `md:grid-cols-2` DomainRow fallback (optional)

### Priority 3 — `/trading` presentation polish (defer — ~half day when reached)
After Priorities 1 and 2 ship:

- Format `legs_json` into a legs table
- Markdown render the brief content
- Collapse the focus toggle into the signal list itself (clicking a card = focus action, no separate pill row)

---

## Order

**Priority 1 + Priority 2 ship together in one PR (Slice 3.5: contract migration + polish).**
**Priority 3 ships separately as Slice 4 (Trading polish), unless Slice 4 = Ravens (Oracle Drawer) per the v1.5 roadmap — which is the next milestone codename.**

Codex pick: Slice 3.5 first (low-risk, high-leverage). Ravens (Oracle Drawer + ⌘K + notifications + agent pages) waits for after 3.5 lands.

---

## Bottom line

Slice 3 is real and good. Composition is locked. Foundation is solid. Move to contract migration + polish. v1 ships when 3.5 lands.

**End of critique.**
