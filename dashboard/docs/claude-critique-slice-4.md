# Slice 4 Critique — The Ravens (Oracle Drawer + ⌘K + Agent Escalation)

**Verdict: ACCEPTED as the new baseline.** This is the productivity unlock that turns the dashboard from "beautiful overview" → "real operator surface." Ravens drawer is live, Claude escalation works on Windows (the hardest part), memory hits route through claude-mem, per-agent conversations persist, panel Ask buttons fire, ⌘K is universal. Production build passes, all routes 200.

The fact that Claude escalation works end-to-end on Windows — given how fragile `claude.exe` shell invocation can be — is a real piece of engineering. Codex's switch to direct `.exe` resolution + `stdio: ignore/pipe/pipe` was the right call and noted for posterity.

---

## What's right (substantive)

1. **Persona system actually consumed correctly.** `readPersonaSystemPrompt(slug)` extracts the System Prompt section from the markdown without editing the persona file itself. This preserves the Claude-owns / Codex-consumes boundary exactly as specced. The 5 personas now drive real agent voice.
2. **Per-agent conversation persistence in SQLite.** `dashboard/data/conversations/{agent}.db` is the right shape — gives us a foundation for the Mímir's Well browser later. Codex made the smart call to keep the schema simple now and let it grow.
3. **`ravens:open` global event** is the right pattern. Sidebar trigger + per-panel buttons + ⌘K all funnel through the same dispatch. Clean.
4. **Detected-agent routing + voice preamble.** *"💰 Perseus consults the books."* on a parlay query = exactly the personality moment that makes the Council feel real.
5. **Recent queries persisted.** Small detail, big UX win — opens to last 5 instead of empty.
6. **Secondary Sauron escalation button** when query is research-heavy. Smart auto-detection of "this is web research, not memory lookup."

---

## What needs attention (none are blockers — all are Slice 4.5 polish)

### 1. Pin as memory + Save to Saga + Continue conversation = **the missing 20% of Ravens value**
These aren't decorative. **"Pin as memory"** is the single highest-leverage feature still pending — it converts an ephemeral chat exchange into durable `MEMORY.md` index entry. Without it, valuable insights die in `data/conversations/*.db` and never bubble up to future sessions. Ship this first in 4.5.

**"Save to Saga"** = appends the exchange to today's Obsidian Daily Note. Useful but lower priority than Pin.

**"Continue conversation"** = navigates to `/lebot-james` (or wherever) with the conversation pre-loaded. The agent chat surface doesn't exist yet — so this button needs the agent route to grow up first. Defer.

### 2. Cost confirmation > $0.50 is a real safety
Without this, a long-context Lebot query could accidentally burn meaningful tokens. Small UX win: render the estimated cost in the escalate button, and pop a "this query may cost ~$X.XX, proceed?" modal only when estimated >$0.50. Cheap to add, prevents oops moments.

### 3. Arrow-key navigation — finish it
Partial is worse than absent (the UX becomes inconsistent). Either ship full ↑/↓ navigation across memory + files results, OR remove what's there until it's complete.

### 4. Visual density — I'll defer until I see screenshots
Codex's instinct ("may want taste pass on density / spacing / visual hierarchy") is usually right when they self-flag it. Send me screenshots in the next round and I'll do a focused critique pass.

### 5. Route-local search on `/memory` and `/activity`
Not built yet. When those pages get real surfaces (Slice 4.5 or 5), ⌘K on those routes should focus the page-native search, NOT open Ravens. Document this in the route page when implementing.

---

## Answers to Codex's 5 questions

| # | Question | Answer |
|---|---|---|
| 1 | Slice 4 accepted as baseline Ravens? | **Yes.** Production-grade. Claude escalation on Windows is real expertise. |
| 2 | Drawer dense enough or visually calmer? | **Defer until I see screenshots.** Your instinct that taste pass is needed is probably right. Send me 2-3 screenshots (empty state, populated results, after escalation) and I'll do a focused visual critique. For now, ship it. |
| 3 | Next slice priority? | **Ravens polish/completion + `/memory` real surface as Slice 4.5** (single combined PR). Life-dashboard waits for Slice 5. Reason: completion items are small + ride freshly-shipped code; `/memory` reuses the Ravens search infrastructure you just built. Maximum compound leverage. |
| 4 | Per-panel Ask buttons phrased/placed correctly? | **Phrasing is right** ("Ask Perseus" / "Ask Lebot" — direct, agent-specific). **Placement defer pending screenshots** — small in panel header, not interrupting data, is the spec. If they're there, ship it. |
| 5 | Exact next 3 implementation priorities? | See below. |

---

## Next 3 implementation priorities

### Priority 1 — **Slice 4.5: Ravens completion + `/memory` real surface** (~1 day)

Combine the missing Ravens polish items with the first real Mímir's Well build. Single atomic PR.

**Ravens completion:**
- **Pin as memory** button → appends to MEMORY.md with auto-generated frontmatter (use existing `lib/memory.ts` if it exists, otherwise add it). Highest-leverage missing feature.
- **Save to Saga** button → appends conversation snippet to `Obsidian Vault/Daily Notes/{date}.md` (timestamped).
- **Cost confirmation** modal when estimated cost > $0.50.
- **Arrow-key navigation** — finish what's started, OR strip what's there until complete.

**`/memory` real surface** (spec at `dashboard/docs/MIMIR-WELL-SPEC.md`):
- Card grid of memory entries (3 cols at `lg`, 2 at `md`, 1 at `sm`)
- Search across `MEMORY.md` index + claude-mem corpus
- Type tag chips (user/feedback/project/reference)
- Per-card actions: Open, Pin/Unpin, Archive (×)
- Click card → modal/drawer with full memory markdown
- `⌘K` on `/memory` focuses the page-native search (not Ravens)

The synergy: Ravens already searches memory via claude-mem. `/memory` is the deeper browsing surface for the same data. Build them together.

### Priority 2 — **Slice 5: `/activity` (Heimdall's Watch) + life-dashboard placeholders** (~1 day)

Real `/activity` page (spec at `dashboard/docs/HEIMDALL-WATCH-SPEC.md`):
- Filter chips: domain (Doctor/Trading/Tasks/Saga/Forge/Hoard/Agents) + time range
- Dense terminal-style event log, 50/page paginated
- Click row → expand inline with full structured detail
- Reuses Ravens's conversation history + existing `lib/events.ts`

Plus elegant placeholders for life-dashboard panels (Hoard / Forge / Daily Rites / Saga) — appear on home with "v2: Plaid coming" / "v2: Apple Health coming" empty states. Don't wire real data yet.

### Priority 3 — **Slice 6: Yggdrasil hotspots when night scene image lands**

Once you deliver the Midjourney NIGHT scene image (`public/art/scenes/night-norse-stars.webp`), Codex implements the 9-hotspot overlay on `/skills` per `dashboard/docs/YGGDRASIL-HOTSPOTS-SPEC.md`. ~2 hours. Replaces the current vertical-list fallback.

---

## Message to Codex

> **Codex —**
>
> Slice 4 accepted as the Ravens baseline. The Windows Claude escalation work is the strongest engineering in the project. Persona consumption + per-agent SQLite + ⌘K + panel Ask buttons all shipped cleanly.
>
> **Next: Slice 4.5 — Ravens completion + `/memory` real surface as one PR.**
>
> Read in order:
> 1. `dashboard/docs/MIMIR-WELL-SPEC.md` (the `/memory` spec)
> 2. `dashboard/docs/claude-critique-slice-4.md` (this critique with full Slice 4.5 priorities)
>
> Build all of:
> - **Pin as memory** button in Ravens response section — appends to `MEMORY.md` with frontmatter. Highest priority.
> - **Save to Saga** button — appends to today's Obsidian Daily Note
> - **Cost confirmation** modal when estimated cost > $0.50
> - **Arrow-key navigation** — finish ↑/↓ across memory + files results
> - **`/memory` real surface** — card grid + search + filter chips + per-card actions + click-to-expand modal
> - **⌘K on `/memory`** focuses page-native search, NOT Ravens (route-local context switch)
>
> Send me 2-3 Ravens drawer screenshots in your handoff doc (empty state, populated results, after escalation) so I can do the visual density critique I deferred.
>
> **Don't touch:**
> - `data/quotes.json`, `data/sauron-watches.json`
> - `personas/*.md` (6 files now — Aristotle joined as deferred 6th)
> - `DESIGN-LANGUAGE.md`, `RAVENS-DRAWER-SPEC.md`, `LOOP-LIBRARY.md`, `YGGDRASIL-HOTSPOTS-SPEC.md`, `MIDJOURNEY-PROMPT-BANK.md`, `MIMIR-WELL-SPEC.md`, `HEIMDALL-WATCH-SPEC.md`
> - `scripts/loops/**`, `scripts/tools/**`
> - `.env.local`
>
> **Plus-tier note:** Woody hit token exhaustion this afternoon. Your next slice may not start until your quota resets (~3hr cycles on Plus). When you do come back, ship 4.5 atomic + write `dashboard/docs/codex-slice-4-5-ravens-completion-memory.md`. Then ping for critique.

---

**End of critique.**
