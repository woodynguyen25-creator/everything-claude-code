## Dashboard Cleanup Plan — 2026-05-25

### Goal
- Reduce dashboard drift after multiple passes.
- Remove truly orphaned home-era components and stale docs.
- Leave the shipped surfaces easier for Claude to reason about.

### Scope
- Delete unused homepage/footer components that are no longer imported anywhere in live source.
- Keep active routes, APIs, and shared council/triad infrastructure intact.
- Rewrite the state/handoff docs so they describe the current dashboard, not previous stacked-home versions.

### Verification
- `npm run build`
- `npm run typecheck`
- capture current `/` first-load JS from the production build output

### Guardrails
- No new features beyond cleanup/documentation polish.
- Prefer deletion over re-abstraction.
- If a component still has a live import path in `app/`, `components/`, or `lib/`, keep it.
