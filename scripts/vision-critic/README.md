# vision-critic

An independent set of **eyes** for web builds. The build→verify loop could capture pixels
(Playwright) and generate assets (Higgsfield), but nothing perceptually **graded** the render — it
dead-ended at the builder's own eye, which is blind to its own work (the Lucky Dog gallery was
rejected twice for looking boxed/generic). This wires a vision model into the loop.

**Doctrine:** *Sol READS code (blind); Grok SEES pixels.* The builder must never grade its own
homework, so the critic defaults to **Grok-4.5** — a model that did not write the page — scoring the
screenshot against the taste-corpus laws + Woody's reject-calibration.

## Install / requirements

- Node 18+ (uses built-in `fetch`). Zero npm deps for grading.
- `XAI_API_KEY` in `dashboard/.env.local` (same file the council reads). `--seat openai` works too if
  `OPENAI_API_KEY` is set.
- Screenshot capture (`--capture URL`) is best-effort: it reuses a locally-installed Playwright
  (checks `lucky-dog-landing/node_modules`, then cwd). If none is found, pre-capture shots with the
  Playwright MCP or the `webapp-testing` skill and pass `--build`.

## Usage

```bash
# grade pre-captured screenshots against a brief
node scripts/vision-critic/critic.js --build hero-1440.png,hero-375.png \
  --brief "Lucky Dog cosmic hero; award-caliber; must NOT look boxed/template-y"

# grade against a reference / target look (match FEEL, not pixels)
node scripts/vision-critic/critic.js --build build.png --ref target-site.png --brief "..."

# capture a live URL first, then grade
node scripts/vision-critic/critic.js --capture http://localhost:3000 --breakpoints 1440,375 --brief "..."

# machine-readable
node scripts/vision-critic/critic.js --build shot.png --json --out verdict.json
```

Flags: `--build a,b` shots to grade · `--ref a,b` reference look · `--brief "…"` context ·
`--capture URL` screenshot first · `--breakpoints 1440,375` · `--seat grok|xai|openai` ·
`--model <id>` · `--json` · `--out file.json` · `--tag label` (ledger).

## Output

Human-readable by default: verdict (SHIP/REVISE/REJECT), 0-100 score, the single harshest true line,
a "would Woody reject?" call, 9 axis scores (slopTells, hierarchy, typography, color, spacing, depth,
craft, motionImplied, brandFit), the slop tells it SEES, and a severity-ranked fix-list. `--json`
emits the raw verdict object (see `rubric.md` for the schema).

**Exit code gates a loop/CI:** `0`=SHIP, `1`=REVISE, `2`=REJECT, `3`=error.

Every run appends to `dashboard/data/vision-critic-ledger.jsonl`.

## The grading bar

Lives in `rubric.md` — the taste-corpus laws (anti-slop, hierarchy, type, depth, craft, implied
motion, brand fit) + Woody's reject-calibration (boxed grids, naked card grids, template tells,
black voids, broken reveals). Edit that file to retune the bar; the critic reads it at runtime.

## Iterate loop (the intended use)

```
build → screenshot → critic → if REVISE/REJECT: apply topFixes → screenshot → critic → … until SHIP
```

## Wiring into gan-design (next step)

The `gan-design` harness's evaluator currently scores its own screenshots with a text oracle. Replace
that call with `critic.js --json` so the GAN loop is graded by an independent vision model instead of
a text model reasoning about a picture it can't truly see.
