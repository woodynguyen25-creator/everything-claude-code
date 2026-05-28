# Codex Slice 1 — Foundation Hygiene

Date: 2026-05-18
Author: Codex
Status: implemented, verified locally, ready for Claude critique

## What shipped

### Fonts

- Moved fonts from CSS `@import` to `next/font/google`
- Added:
  - `Cinzel`
  - `Inter`
  - `JetBrains Mono`
- Applied them through CSS variables on `<body>` in `app/layout.tsx`

### Tokens

- Added `styles/tokens.css`
- Moved the core palette there using OKLCH component values
- Updated `tailwind.config.ts` to read colors from CSS variables
- Kept the existing semantic token names so the surface did not need a full rewrite

### Navigation

- Demoted placeholder routes from primary nav
- `NAV` now contains only `Home`
- Added a secondary `REALM` cluster:
  - `Yggdrasil`
  - `Mimir's Well`
  - `Heimdall's Watch`
- Kept the agent cards, but dimmed inactive styling a bit more

### Error handling

- Added root route error boundary at `app/error.tsx`
- Hardened API routes with `try/catch` and explicit 500 JSON responses:
  - `app/api/doctor/route.ts`
  - `app/api/trading/route.ts`
  - `app/api/tasks/route.ts`
  - `app/api/tasks/[id]/route.ts`
- Added a graceful unavailable state to `TasksPanel`
- Added a graceful unavailable state to `TradingPanel`

### Home/stat row cleanup

- Removed the hardcoded `Messages` stat from `app/page.tsx`
- Home stat row is now:
  - `Doctor`
  - `Signals`
  - `Last Active`

### Norse vocabulary pass

- `Daily Signals` → `Slate of Fates`
- `Next Actions` → `Today's Rites`

## Files changed

- `app/layout.tsx`
- `app/globals.css`
- `styles/tokens.css`
- `tailwind.config.ts`
- `components/Sidebar.tsx`
- `app/api/doctor/route.ts`
- `app/api/trading/route.ts`
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`
- `app/page.tsx`
- `components/TradingPanel.tsx`
- `components/TasksPanel.tsx`
- `app/error.tsx`

## Verification

Ran:

```bash
npm run typecheck
```

Result:

- pass

Checked live:

```bash
GET http://127.0.0.1:3737/           -> 200
GET http://127.0.0.1:3737/api/doctor -> 200
GET http://127.0.0.1:3737/api/trading -> 200
GET http://127.0.0.1:3737/api/tasks  -> 200
```

## What is still mocked / incomplete

- `PromptBar` is still a stub
- `skills`, `memory`, `activity`, and `fenrir` remain placeholders
- `DoctorPanel` still depends on the current `readDoctor()` shape without hard schema validation
- `TradingPanel` still consumes the old `readTrading()` shape
- Home layout is still the equal-width 3-panel foundation, not the new asymmetric command-center composition

## My engineering take after Slice 1

This was the right amount of change for a first hygiene pass.

The foundation is now cleaner, less brittle, and more aligned with the eventual design language. But the app still does not earn its home screen yet. The next real leverage point is still the same:

- make Trading real
- define the first honest panel contract
- then reshape the home composition around that signal

## Questions for Claude

1. Does the new nav demotion go far enough, or should the `REALM` routes be hidden even more aggressively until they are real?
2. Should `Today's Rites` stay as the Tasks title, or does it drift too far into themed language for a utility panel?
3. Is `Slate of Fates` the right tone for Trading, or should that panel title stay a bit more operational?
4. Before Slice 2, do you want any additional visual hardening on the shell, or should all further attention move to the Trading slice first?

## Recommendation

Proceed to Slice 2 next:

- define panel contract
- harden trading adapter
- make Trading the first truly useful panel
