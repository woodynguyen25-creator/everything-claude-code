---
name: anti-slop
description: The death of AI slop in design work. Load before ANY design/site/ad/brand build or review — severity-tiered AI-design tells (P0/P1/P2), craft-credit scoring, the 3-directions workflow, two-references rule, tunable taste dials, the exemplar-delta audit, the blurred contact-sheet divergence judge, the 3-direction preview loop (directions.mjs), and an EXECUTABLE ship gate (shipgate.mjs). Pairs with the impeccable detector (mechanical floor) — this skill sets the taste ceiling. Triggers: design, website, landing, hero, brand, ad creative, "looks AI", slop, generic.
version: 1.4.0
user-invocable: true
---

# Anti-Slop Doctrine

> Distilled 2026-07-02 from: Anthropic frontend-design fragment, Sailop 73-rule manifesto, solodesign.cc tells, `ai-design-tells` craft-credit model, Malewicz "Slopless", Superdesign workflow analysis, impeccable v3.9.x. **v1.1 (7/03):** absorbed two mechanisms from a fresh gap-scan (pushREC/claude-design-skill's ship-gate, Raylinkh/design-register-commit's forced-commitment) as concepts, not vendored code — both source repos were 0★/unproven; the *mechanisms* are sound, the *tools* aren't worth installing. Core architecture: **deterministic rules hold the floor; taste sets the ceiling.** Written guidance is probabilistic — a mechanical FAIL is not.

## The Iron Law

Models converge on "on-distribution" output. Every default you accept without compensation is a tell. **A default is fine ONLY if something else visibly carries the design (craft-credit).** Purple isn't a tell (Stripe: 123 purple accents). Inter isn't a tell (Linear). The tell is the default **with nothing compensating**.

## Workflow (never skip step 2 — it's the one that kills sameness)

1. **Force-commit to ONE named register BEFORE the tool opens** (the strengthened step 1 — was "plant a stake," now a hard pick, not a vibe). Choose one from: `editorial-luxury` · `brutalist-industrial` · `soft-structuralism` · `cinematic-dark-tech` · `heritage-craft` · `retro-futurism` · `swiss-international` · `maximalist-collage` · `quiet-clinical`. Then name **TWO references to remix within that register**: "Linear's typography discipline × Pitchfork's editorial color." Never zero, never one (that's cloning), never "pick whatever fits" (that's the sameness bug — forced-commitment beats critique-after-the-fact because there's no generic middle to fall back into).
2. **Explore 3 genuinely distinct directions** (structurally distinct — different layout skeletons, not recolors) — all three must still fit the register locked in step 1. Render/describe all three. Choose.
3. **Spec it — DESIGN.md** (tokens, type scale, radius hierarchy, motion personality, the signature moment, the register name) before code.
4. **Code to spec.** One fused "make it pretty" prompt = guaranteed slop.
5. **Mechanical pass before ship:** `node ~/.claude/skills/impeccable/scripts/detect.mjs <dir-or-url>` (45 deterministic rules) + the P0/P1/P2 table below. Fix P0s always; P1s need a craft-credit excuse; P2s are judgment.
6. **Taste pass last** — motion + the signature moment: the two things no rule can check.
7. **SHIP GATE — hard block, not advisory.** Nothing ships (no handoff marked complete, no client delivery, no "done") until ALL of: register declared (step 1) → 3 directions were genuinely explored (step 2, not skipped) → DESIGN.md exists (step 3) → detector run with P0=0 (step 5) → taste pass done (step 6) → **external critique run (step 8)**. If any gate is unchecked, the deliverable is **NOT DONE**, full stop — this is the difference between a checklist (ignorable) and a gate (blocking). Wire this into the AIOS-TASK-HANDOFF "Acceptance Criteria" section explicitly.
8. **CODEX CRITIQUE — second pair of eyes, mandatory before ship** (v1.2, proven on kairo-showcase 7/04 where it caught "polite Tailwind page" drift the author couldn't see). Run: `codex exec --sandbox read-only "<harsh design-engineering critique: motion quality vs role-based easing, typography craft, layout timidity, animation perf (re-renders/layout-thrash/blur), a11y, top-5 ranked upgrades with exact files>"` from the project root. Triage its findings like detector output: perf/a11y items are P0-tier (fix), taste items get a judgment pass (the author still owns taste — Codex flags, Fable decides). Self-review always rationalizes; the gate exists because the builder cannot see their own drift.

## The Tell Table

**P0 — never ship (instant AI-slop identification):**
| Dim | Tell |
|---|---|
| Color | `from-purple-500 to-pink-500` (or any 135° purple→pink/blue gradient); gradient `bg-clip-text` headline; gradient buttons |
| Layout | Centered hero: pill badge ("Now in beta ✨") → H1 → subhead → filled CTA + ghost CTA; 3-card icon/heading/2-lines feature grid |
| Component | Icon-in-rounded-square with gradient fill; glassmorphism reflex (`bg-white/10 backdrop-blur border-white/20`) with no design reason |
| Copy | "Elevate your workflow" / "Seamless" / "Powerful"; emoji bullets ✨🚀⚡🎯; fabricated stats/"Trusted by" fake logo wall |
| Motion | `transition-all duration-300 ease-in-out` blanket-applied; identical fade-in-up on every element |

**P1 — needs a compensating craft-credit or it's a tell:**
| Dim | Tell |
|---|---|
| Color | Untouched shadcn zinc/slate; pure #fff/#000; timid evenly-spread palette; alternating #f5f5f5/white sections |
| Type | Inter/Roboto/Poppins as the ONLY face; weight-700 + -0.02em on every display; line-height 1.5 everywhere; no serif/sans or display/body pairing; Space Grotesk as the "safe" non-choice |
| Layout | Navbar>Hero>Features>Testimonials>CTA>Footer with zero deviation; Starter/Pro/Enterprise + green checks; 4-col Product/Company/Resources/Legal footer; everything center-aligned, zero asymmetry |
| Component | One radius everywhere (`rounded-2xl shadow-md` on all surfaces — no radius hierarchy); card-in-card nesting; Lucide Sparkles/Zap/Shield everywhere |
| Spacing | Uniform gap-4/p-6; identical section padding top-to-bottom |

**P2 — judgment calls (fine in product UI, weak in brand work):**
max-w-3xl centered text column · only 4px-multiple spacing · DiceBear avatars · Spline default blob · no text-wrap:balance · spinner loaders.

**Craft-credits (what buys back a default):** custom/characterful display face · optical tracking tuned per size · radius hierarchy (or committed sharp = editorial) · designed focus/error/empty states · one orchestrated signature moment · OKLCH-derived palette with one dominant + sharp accents · off-grid rhythm (14px, 22px) · contained/full-bleed section alternation · a deliberate flaw (perfect symmetry reads machine).

## Taste Dials (declare in every DESIGN.md, 1–10)

- `DESIGN_VARIANCE` — 2 = corporate-safe · 5 = confident · 8+ = award-bait experimental
- `MOTION_INTENSITY` — 2 = fades only · 5 = orchestrated reveals · 8+ = scroll-scrubbed cinematic
- `VISUAL_DENSITY` — 2 = luxury whitespace · 5 = balanced · 8+ = editorial dense
Defaults for studio work: variance 7, motion 6, density 4 (dark editorial/cinematic lane).

## Running step 2 — the direction loop (v1.4, 2026-08-13). DO NOT SKIP.

Step 2 is the step that gets skipped. Measured: on the AJR rebuild — the build that
existed to prove this doctrine — the ship gate scored **2/6** and step 2 was one of the
two misses. It gets skipped because "describe three directions" is not a deliverable
and nobody can choose from prose. **Woody decides by looking.** Give him pictures.

```
mkdir .directions
# write THREE standalone .html studies — a.html b.html c.html.
# Hero-level only: masthead + first screen. 20 minutes each, not a site.
# Each must fit the register but differ in SKELETON, not palette.
node ~/.claude/skills/anti-slop/scripts/directions.mjs .directions \
     --labels "editorial-luxury,swiss-ledger,heritage-craft" --mobile
```

Produces `directions.png`: the three rendered side by side with a structural readout
(ground luminance · dominant face · type steps · radii · **ink centroid**). Show it. He
picks a letter. That letter goes into `DESIGN.md` as `Direction chosen: B` and becomes the
locked register.

**The tool refuses to flatter you.** If two studies share ≥2 of {ink mass, dominant face,
ground luminance} it prints `⚠ NOT DISTINCT` — that is three colourways of one idea, which
is the classic fake-exploration failure. Rewrite the loser; do not proceed.

*(Both heuristics were wrong on first build and produced false "not distinct" verdicts —
`<style>` textContent dominated the font tally and viewport-sized wrappers dominated the
centroid. Fixed and re-verified: a false alarm here teaches you to ignore the one signal
that makes step 2 trustworthy.)*

## The gate is a program now — `shipgate.mjs` (v1.4)

The ship gate below says "hard block, not advisory." It was prose, so it was advisory, so
it scored 2/6. Now:

```
node ~/.claude/skills/anti-slop/scripts/shipgate.mjs <project-dir> [--build app/dist]
```

Nine checks, **exit 1 if any fails**: DESIGN.md · register declared · two references ·
three dials · `directions.png` exists (proof step 2 ran) · a direction was recorded ·
detector P0=0 on the **freshest** build · `contact-sheet.png` exists · external critique
**checkbox actually ticked**.

It fails closed and it does not accept good intentions: an unchecked `- [ ]` in your own
Definition of Done is read as a FAIL, and a build directory it cannot scan is a FAIL, not
an "unknown". Run it before you tell anyone the work is done.

## The Cloning Trap — borrowing tokens is not escaping the basin (v1.3, 2026-08-13)

The dominant "fix AI slop" advice in circulation is: **pull a famous site's design tokens
(Linear, Phantom, Vercel) and hand them to the model.** It is seductive because the output
*improves immediately* — real spacing rhythm, real type scale, a real elevation ladder.

**It is a slop generator with a longer fuse.** Copying one exemplar's tokens does not exit
mode collapse; it *relocates* it. The population just moves from the shadcn basin to the
Linear basin — better proportioned, equally identical, and now identical in a way that
reads as deliberate theft to anyone who knows the source. The advice is usually delivered
with its own refutation attached: *"not that Linear is the peak of design, but it is a
billion-dollar company."* Popularity is being used as a proxy for fit, and fit is the whole
job.

**The rule stands: TWO references, remixed, from different domains. One reference is
cloning** (step 1). If a token dump enters the project, it is a *measurement instrument*,
never a source: read the RATIOS out of it (type scale ratio, whitespace ratio between
adjacent blocks, elevation steps, optical tracking curve) and discard the values. Ratios
are craft; hex codes and font names are someone else's identity.

**Corollary — the strongest reference is not a website.** Web references teach web grammar,
which is the grammar we are trying to escape. Pull structure from print, packaging, signage,
record sleeves, technical manuals, and scientific plates (are.na · fontsinuse.com ·
letterformarchive.org). The Molecules build's register — *Aesop × Swiss clinical price
list* — is the pattern: one taste source, one **non-web** structural source.

## Exemplar-Delta Audit — make "it looks mid" numeric

The real value hiding inside the token-copying advice is **articulation**: the ability to
say *why* a page is worse than a reference instead of feeling it. That is measurable, and
measurement is not imitation.

Run against ONE named exemplar chosen for FIT (not fame), and report a delta table only:

| Axis | Measure | Ours | Exemplar | Verdict |
|---|---|---|---|---|
| Type scale | ratio between adjacent steps | | | |
| Display size | max display px ÷ body px | | | |
| Tracking | letter-spacing at display size | | | |
| Whitespace | ratio of adjacent block gaps (design runs ~1:7; AI runs ~1:1.2) | | | |
| Elevation | number of distinct shadow/surface steps | | | |
| Radius | number of distinct radii (1 = tell) | | | |
| Density | text px² ÷ viewport px² | | | |

**Fix the RATIOS, never copy the values.** Output is a diagnosis, not a skin. If the audit
ends with "adopt their palette," it was run wrong.

## Cross-Project Divergence — the gap per-project discipline cannot see

Every mechanism above disciplines ONE project against the population. **Nothing compares
project N against projects 1..N-1**, so a studio can execute the doctrine perfectly on every
build and still converge on a house style it never chose. Council 2026-08-13 (`antislop-system`,
xai + claude — degraded quorum 2/3, codex timed out) landed on this independently from both
seats; it is the one structural hole.

**The judge — run before ship, not after:**

```
node ~/.claude/skills/anti-slop/scripts/contact-sheet.mjs <url-or-dir> [more...]
```

Screenshots each site at 1440 + 390, greyscales and gaussian-blurs it, and tiles the results.
Blur strips content and exposes the layout skeleton — silhouette, rhythm, mass distribution.
**If the new build sits in the same visual cluster as the last five, it failed**, regardless
of how different its palette and copy are. This operationalises the standing rule *the
photograph is the judge* ([[read-vs-see]]): the eye, not the intention, decides.

Divergence is required on at least TWO of: silhouette/axis · type family class · dominant
mass distribution · motion signature · color structure.

## Known routing failure (read before concluding the doctrine "doesn't work")

Measured 2026-08-13 across 107 logged skill loads: **`anti-slop` = 1 load, `gauntlet-loop`
= 0 loads**, while `ui-ux-pro-max` = 8, `impeccable` = 7, `design-critique` = 6. **We load
the skills that POLISH and never the ones that DECIDE.** Polishing a generic direction
yields a well-finished generic page — which is precisely the "looks AI-made" complaint.
The direction-setting step is step 1, it is cheap, and it is the one that gets skipped.

`gauntlet-loop` (blind-critic adversarial loop to an explicit bar) additionally requires
spawning sub-agents, which a standing global instruction suppresses — so the single
highest-leverage quality loop in the stack is structurally unreachable. **Ask Woody to
authorise sub-agents explicitly when a build needs hero quality**; do not silently skip it.

## Interlock (studio stack)

- **Floor:** impeccable v3.9.1 detector (45 rules, no LLM) — runs via hook on edits + manually pre-ship.
- **This skill:** the P0/P1/P2 + craft-credit layer + workflow discipline.
- **Ceiling:** WEB-DESIGN-ARSENAL doctrine (DFII ≥8, differentiation anchor, ABSOLUTE-ZERO bans, Definition-of-Done) + `/impeccable critique|audit|polish`.
- **Ads:** see `Command Center/AI Business/AD-CREATIVE-DOCTRINE.md` (test hierarchy, 3:2:2, hook library, lighting language).

Treat every AI first-render as a junior designer's first draft. Use AI for 90%; the last 10% — read the output, don't just look at it — is what signals taste.
