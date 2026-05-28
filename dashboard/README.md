# AIOS Dashboard — v1 foundation

Woody's local-first "Claude Code OS" command center. Norse-themed (Odin & Fenrir replace Hermes & Open-Claw). Inspired by Jack Roberts' dashboard layout.

```
http://localhost:3737
```

## Stack

- **Next.js 14** App Router (TypeScript, strict mode)
- **Tailwind 3.4** with Norse design tokens
- **better-sqlite3** for tasks panel
- **Cinzel** (display) + **Inter** (body) + **JetBrains Mono** (mono)

## Quickstart

```bash
cd dashboard
npm install
npm run dev   # → http://localhost:3737
```

## v1 surface

| Route          | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `/`            | AIOS-AGENT (Odin) home + Doctor / Trading / Tasks    |
| `/fenrir`      | FENRIR-AGENT placeholder (v2)                        |
| `/skills`      | Yggdrasil — placeholder for v1.5 skill browser       |
| `/memory`      | Mímir's Well — placeholder for v1.5 memory browser   |
| `/activity`    | Heimdall's Watch — placeholder for v1.5 activity log |
| `/api/doctor`  | Reads `~/.claude/logs/aios-doctor/last-run.json`     |
| `/api/trading` | Scans ParlayBot logs/data + TradingView vault        |
| `/api/tasks`   | SQLite CRUD (GET/POST/PATCH/DELETE)                  |

## Data contracts

External data sources are isolated in `lib/paths.ts`. To retarget, edit one file.

- **Doctor**: `~/.claude/logs/aios-doctor/last-run.json` (schema in `lib/doctor.ts`)
- **Trading**: scans `C:\Github Repos\parlay-bot\logs`, `parlay-bot\data`, and `Documents\Obsidian Vault\TradingView Assistant\` for any file containing "brief" or "morning"
- **Tasks**: SQLite at `dashboard/data/tasks.db` (WAL mode, gitignored)

## File map

```
dashboard/
├── app/
│   ├── layout.tsx              # Root layout + Sidebar mount
│   ├── page.tsx                # Odin home (hero + stat row + 3 panels)
│   ├── globals.css             # Tailwind + Norse CSS vars + font imports
│   ├── fenrir/page.tsx         # Fenrir placeholder
│   ├── skills|memory|activity/page.tsx  # placeholders
│   └── api/
│       ├── doctor/route.ts
│       ├── trading/route.ts
│       └── tasks/route.ts + [id]/route.ts
├── components/
│   ├── Sidebar.tsx             # Left rail (client) — agent cards + nav
│   ├── AgentHero.tsx           # Cinematic hero (server)
│   ├── PromptBar.tsx           # Stub prompt input (client)
│   ├── StatRow.tsx             # 4-stat strip
│   ├── DoctorPanel.tsx         # Reads doctor.ts (server)
│   ├── TradingPanel.tsx        # Reads trading.ts (server)
│   ├── TasksPanel.tsx          # SQLite CRUD via fetch (client)
│   ├── OdinGlyph.tsx           # Placeholder SVG — Ansuz rune + ravens
│   └── FenrirGlyph.tsx         # Placeholder SVG — wolf head
├── lib/
│   ├── paths.ts                # Single source of truth for filesystem paths
│   ├── doctor.ts               # readDoctor() — typed AIOS Doctor JSON
│   ├── trading.ts              # readTrading() — ParlayBot + Morning Brief
│   └── tasks.ts                # SQLite wrapper
├── data/                       # SQLite lives here (gitignored)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── postcss.config.mjs
```

## Locked decisions (do not change without asking)

- **Theme**: Norse mythology (Odin = gold, Fenrir = blood)
- **Repo**: stays at `everything-claude-code/dashboard/`
- **Port**: 3737 (avoids Lucky Dog 5173, generic 3000)
- **Hosting**: localhost only, no cloud
- **Personas system**: deferred to v2 (free models only when added)
- **Real cinematic art**: deferred (user swaps SVG glyphs manually)

## Verified working (2026-05-18 smoke test)

- ✓ All 5 page routes return 200
- ✓ All 3 API routes return correct shapes
- ✓ Doctor JSON parses live (11 fixed findings from 01:27)
- ✓ Trading panel finds ParlayBot `calibration.json`
- ✓ Tasks panel: created task id=1, persisted, returned
- ✓ TypeScript strict mode clean (`npx tsc --noEmit` → 0 errors)
- ✓ Dev server ready in 1.1s

## Codex audit pass — what to look at

Per the 2026-05-17 Codex handoff, this build is ready for an audit/tighten pass:

**Strong / leave alone:**
- Norse theme + Odin/Fenrir codenames (user-locked)
- `lib/paths.ts` single registry (clean retarget path)
- Server-component panels with `force-dynamic` (no stale data)
- SQLite WAL + typed schema

**Open for tightening:**
- `lib/trading.ts` does substring matching on filenames — could be smarter once ParlayBot output schema stabilizes
- `PromptBar.tsx` submission is a no-op stub; needs wiring to the Claude OS Bridge skill in v1.5
- No error boundaries yet; one bad fs.readFile in a server component will 500 the page
- `next.config.mjs` is minimal — no image optimization, no headers config
- `globals.css` Google Fonts import is a render-blocking request; could self-host or use `next/font`
- No tests yet (intentional for v1; add Playwright pass in v1.5)
- Stat row "Messages" value is hardcoded `—` (no real source yet)
- Sidebar agent cards use `Link` to `/` and `/fenrir`; if there are ever 3+ agents, switch to dynamic config

**Architectural questions for Codex:**
1. Should panels become RSC + Suspense streams instead of awaiting in `page.tsx`?
2. Is the "tasks live in dashboard/data/tasks.db" boundary correct, or should tasks export to Obsidian daily?
3. Should the prompt bar dispatch to a local API endpoint that talks to Claude Code via the `bridge` skill, or via Telegram (matching Jack)?

**Visual questions for Claude critique (next pass):**
1. Hero block is gradient + glyph — needs real cinematic art eventually. Generate via fal.ai? Hand-pick stock?
2. Stat row uses a "messages" placeholder. What's the real Hour-0 metric Woody wants?
3. The 3-column panel grid at `lg:` breakpoint feels Jack-ish. Should we vary panel sizes (bento)?
4. Is the Cinzel display font right, or is it too "fantasy paperback"? Alternatives: Trajan, Eczar, Cormorant.

## Future phases

- **v1.5**: Skills browser, Memory browser, Activity log, prompt-bar → Claude OS Bridge skill, real cinematic art
- **v2**: Persona system (free models only), Fenrir unleashed, OpenRouter integration, setup wizard
- **v3**: Tauri or Electron wrapper for desktop, system tray, global hotkey
