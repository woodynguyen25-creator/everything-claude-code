# Dashboard State — 2026-05-25

## Overview

Woody's Realm is a local-first Next.js dashboard at `http://127.0.0.1:3737`, bound to `127.0.0.1` only.

The current shipped surfaces are:

- REALM home
- Council chat routes
- Mímir's Well (`/memory`)
- Heimdall's Watch (`/activity`)
- Yggdrasil (`/skills`)
- Trading (`/trading`)
- Hermes (`/hermes`)
- Ravens drawer
- Triad / God Mode infrastructure

## Home (`/`)

Purpose:
- Woody's primary personal command center

Current section order:
1. HeroBand
2. TODAY → DailyRitesPanel
3. INTERNSHIP HUNT → InternshipPanel
4. HEALTH · WEALTH → WorkoutPanel + FinancePanel
5. MARKETS → UnusualOptionsPanel + NewsFeedPanel
6. COUNCIL'S DREAMS → DreamingSurfaces
7. NEXT ACTION → NextActionCard
8. SYSTEM PULSE → SystemPulseStrip

Primary data sources:
- `data/tasks.db`
- `data/habits.db`
- `data/internships.db`
- `data/finances.json`
- `data/aios-stats.json`
- `data/activity-log.json`
- `data/usage.json`
- `data/codex-usage.json`
- `data/triad-usage.json`
- local trading/news providers
- doctor logs
- Hermes job config/status

## Sidebar

Purpose:
- global navigation + council entry point

Current contents:
- route nav
- council cards
- active agent beam
- Ravens trigger
- ConnectionsStrip
- localhost heartbeat

## Council routes

Routes:
- `/lebot-james`
- `/thor`
- `/perseus`
- `/fenrir`
- `/sauron`
- `/[agent]/[threadId]`

What they do:
- thread list
- chat stream
- God Mode toggle
- interrogator pause/resume flow
- triad-backed deep council path
- Scrying Pool
- memory + persona + saga actions

Primary data sources:
- chat SQLite tables
- persona markdown
- memory APIs
- Ravens actions
- triad routing / provider layer

## Memory (`/memory`)

Purpose:
- Mímir's Well memory browser

What it does:
- list/search/filter memories
- open markdown drawer
- promote/archive/delete
- show refs

Primary data sources:
- `~/.claude/projects/c--Github-Repos-everything-claude-code/memory/`
- `MEMORY.md`

## Activity (`/activity`)

Purpose:
- Heimdall's Watch realm timeline

What it does:
- aggregates recent realm events
- filters by kind / agent / time window
- polls every 30 seconds

Primary data sources:
- `data/triad-usage.json`
- `data/activity-log.json`
- doctor logs / savepoints
- daily notes / saga outputs
- council threads
- `data/aios-stats.json`

## Skills (`/skills`, `/skills/[realm]`)

Purpose:
- Yggdrasil realm map + lightweight realm-specific detail pages

Primary data sources:
- local scene image
- doctor signal
- trading detail
- tasks
- activity
- AIOS stats

## Trading (`/trading`)

Purpose:
- trading-specific detail surface

What it does:
- active signals
- latest brief
- latest slate rendering

Primary data sources:
- ParlayBot SQLite
- TradingView Assistant briefs / analysis

## Hermes (`/hermes`)

Purpose:
- job schedule and daemon-status view

Primary data sources:
- `hermes-jobs.json`
- `hermes-status.json`

## APIs

- `/api/activity` — Heimdall event feed
- `/api/chat/[agent]` — council streaming replies
- `/api/chat/threads` — thread list/create
- `/api/chat/threads/[id]` — thread detail/rename/delete
- `/api/chat/threads/[id]/messages` — thread messages
- `/api/chat/stop` — stream cancel
- `/api/doctor` — doctor state
- `/api/doctor/agents` — provider health
- `/api/finances` — finance payload
- `/api/forge/[action]` — triad/utility action execution
- `/api/habits` — daily habits
- `/api/hermes` — Hermes jobs/status
- `/api/internships` — internship list/create
- `/api/internships/[id]` — internship get/update/delete
- `/api/memory` — memory list
- `/api/memory/[name]` — memory detail/mutate/delete
- `/api/memory/refs/[name]` — memory refs
- `/api/news` — news feed
- `/api/ravens` — Ravens search
- `/api/ravens/actions` — pin/save actions
- `/api/tasks` — task list/create
- `/api/tasks/[id]` — task mutate/delete
- `/api/trading` — trading signal payload
- `/api/trading/raw` — raw trading data
- `/api/trading/unusual` — unusual-options feed
- `/api/workouts` — workout data

## Quick Actions state

The triad-backed forge actions still exist at `/api/forge/[action]`, but there is currently no dedicated home-page QuickActions panel.

This is intentional after the Pass 5 home simplification:
- the backend/action surface remains intact
- the UI surface is currently unsurfaced on home

## God Mode flow

1. User turns on the council's God Mode toggle
2. First summon returns interrogator questions and pauses
3. User answers in the next message
4. Council routes through:
   - Thinker
   - selected worker(s)
   - optional critique loop
   - persona-voice synthesis

Pending state file:
- `data/god-mode-pending.json`

## Home cleanup state

Removed from live source:
- old stacked home strips/panels no longer used by `/`
- TracingBeam
- legacy domain-row panel chain
- old token-meter accordion path

Replaced by:
- sectioned bento home
- SystemPulseStrip
- CSS-only BorderBeam

## Known limitations

- `/` first-load JS is improved versus earlier builds but is still above the ideal target
- Quick Actions backend exists without a current dedicated home UI panel
- local runtime startup on Windows shell wrappers remains less reliable than the production build itself
- council / triad infrastructure is powerful but still complex enough that future maintenance should follow the handoff docs
