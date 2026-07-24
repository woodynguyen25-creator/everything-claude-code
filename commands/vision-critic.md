---
description: Grade a rendered web build with an independent vision model (Grok-4.5) against the taste-corpus laws — screenshot(s) [+ reference] → scored, prioritized fix-list. The eyes the build→verify loop was missing.
---

# /vision-critic

An independent set of eyes for a web build. The builder is blind to its own work; this scores the
actual rendered PIXELS against the taste-corpus laws + Woody's reject-calibration, using a model that
did NOT write the page (Grok-4.5). Use it after any build/change to a visual surface, and as the
grader inside an iterate-until-SHIP loop.

## How to run

Tool: `scripts/vision-critic/critic.js` (Node, zero-dep; needs `XAI_API_KEY` in `dashboard/.env.local`).

```bash
# grade pre-captured shots
node scripts/vision-critic/critic.js --build hero-1440.png,hero-375.png \
  --brief "<what this is + the target bar + any must-nots>"

# against a reference look
node scripts/vision-critic/critic.js --build build.png --ref target.png --brief "..."

# capture a live URL first (uses local Playwright), then grade
node scripts/vision-critic/critic.js --capture http://localhost:3000 --breakpoints 1440,375 --brief "..."
```

## When invoked

1. If given a URL and Playwright is available, capture at 1440 + 375; otherwise capture via the
   Playwright MCP / `webapp-testing` skill and pass `--build`.
2. Always pass a `--brief`: what the surface is, the intended bar (award / premium-SMB), and any
   hard must-nots (e.g. "must not look boxed/template-y").
3. Read the verdict. On REVISE/REJECT, apply the `topFixes` (most-severe first), re-capture, re-run.
   Loop until SHIP (exit 0) — do not hand it to Woody on a REJECT.
4. For a reference-driven build, pass `--ref` so it grades feel-match, not just standalone quality.

## Output

verdict (SHIP/REVISE/REJECT) · 0-100 · harshest-true one-liner · "would Woody reject?" · 9 axis
scores · slop tells it SEES · severity-ranked fixes. `--json` for machine use. Exit code gates loops
(0 SHIP / 1 REVISE / 2 REJECT / 3 error). Ledger: `dashboard/data/vision-critic-ledger.jsonl`.

The grading bar is `scripts/vision-critic/rubric.md` — edit to retune; read at runtime.
