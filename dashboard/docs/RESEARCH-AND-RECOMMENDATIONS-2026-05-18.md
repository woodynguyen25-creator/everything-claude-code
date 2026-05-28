# Deep Research & Recommendations — Woody's Realm
**Date:** 2026-05-18
**Author:** Claude Opus 4.7 (with 4 parallel research agents)
**Scope:** 21st.dev + Awwwards + Dribbble + production AI dashboards (Cursor, Linear, Anthropic, Claude.ai, Manus, Lovable, Bolt, v0, Raycast, etc.)
**Status:** Synthesis complete. Honest review + ranked action list.

---

## How to read this document

This is a synthesis of four parallel research streams matched against your **current** dashboard state. Each recommendation is tagged with:

- 🎯 **Highest leverage** — do this first, big visual/UX impact
- 🔧 **Foundation** — invisible but compounding (typography, density, motion grammar)
- ⚡ **Quick win** — <1hr of Codex work, immediate payoff
- 🌟 **Differentiator** — unique to Woody's Realm, helps it win awards
- 🔮 **v2 / deferred** — worth knowing about, not now

I have NOT edited any code. This is research + recommendations only.

---

# Part 1 — Executive Summary (read first)

## The 10 highest-leverage additions

Cross-referenced across all 4 research streams. These appeared as recommendations from MULTIPLE sources.

| # | Addition | What it is | Why every source agreed | Tag |
|---|---|---|---|---|
| 1 | **Aurora Background behind HeroBand** | CSS-driven flowing gradient (Aceternity component) | 21st.dev's #1 fit, Awwwards 2025 dominant trend ("aurora gradients"), Dribbble glow-effect pattern | 🎯⚡ |
| 2 | **`G+letter` jump shortcut system** | Linear-style keyboard navigation (`G H`=home, `G T`=trading, `G A`=Allthing) | Production tool standard (Linear, Vercel, GitHub) — non-negotiable for operator UX | 🔧 |
| 3 | **Single-accent discipline per surface** | Pick ONE agent accent that "owns" each panel, don't light all 5 at once | Linear 2025 refresh principle, Dribbble 2025 trend, prevents "Christmas tree dashboard" | 🔧 |
| 4 | **Three-bucket Inbox (Raven Tally)** | Urgent (interrupt) / Updates (digest) / Activity (silent log) | Linear Inbox standard, maps perfectly to your existing notification system | 🔧 |
| 5 | **ActionPanel pattern on every list item** | Press `K` on any item → shows every possible action with shortcut | Raycast's signature component, "single most underrated UI pattern" | 🌟 |
| 6 | **Pre-bake time-of-day scenes as looping video** | Convert your 4 painterly scenes to ~10s WebM, cross-dissolve via opacity | Lusion v3 / Igloo Inc model (Awwwards SOTY 2023-24) — saves GPU, looks expensive | 🔧 |
| 7 | **Glowing Effect Card on agent tiles** | Mouse-following gradient ring on card border, per-agent color via CSS var | 21st.dev's "single highest-leverage card upgrade" | 🎯 |
| 8 | **Visible plan-before-execute card** | Agent drafts plan, user edits, then quest begins | Devin, Replit, Copilot Workspace converge — trust pattern | 🌟 |
| 9 | **IBM Plex Mono for numbers** | Add as 4th font for prices, P&L, latency, token counts | TradingView, Stripe, Vercel logs standard — non-monospace numbers misread under fatigue | 🔧 |
| 10 | **Loading-as-ritual** (Norse rune ignition) | 1-1.5s rune-light boot animation → dashboard fades in (first session only, cached) | Ameen Abdullah portfolio (Awwwards), differentiator vs spinners | 🌟⚡ |

---

# Part 2 — Honest review of what you have right now

## Strengths (don't change)

1. **Design language doc is exceptional.** 72 locked decisions, Norse semantic spine, OKLCH palette, three-pillar product north star. This is rare. Most projects don't have this depth of documentation. KEEP this rigor.
2. **Painterly art aesthetic is GENUINELY differentiated.** Every research stream flagged "handmade/painterly/imperfect" as the 2025 reaction against AI slop. Your MTG Theros + Hades commitment is exactly on-trend AND specific to YOU. Award-winning territory.
3. **Norse vocabulary as semantic spine** (Wyrd, Hoard, Forge, Mímir's Well, Heimdall's Watch) is brilliant — every research stream noted that "Norse mythology operator UI" is whitespace; nobody owns this category. You can.
4. **Locked color palette in OKLCH** with semantic + agent-accent split is forward-looking. Most dashboards still use HSL/HEX. OKLCH is the 2025+ standard.
5. **Three-font hierarchy** (Cinzel display + Inter body + JetBrains Mono numbers) is right. Only refinement: add IBM Plex Mono as a 4th for trading/numeric density (see #9 above).
6. **Component inventory is solid for v1**: Sidebar, HeroBand, PulseStrip, NextActionCard, SessionGlyph, TodaysWyrd, DomainRow, ActivityStream, DoctorPanel, TradingPanel, AgentHero, PromptBar — covers the operator surface.
7. **5-agent council with painterly portraits** is unique territory. Nobody else has this. Lean in.
8. **Time-of-day mood shift system** is genuinely original (only macOS Mojave/Sequoia is in this territory in OS UX). Could be the differentiator that wins Awwwards 2026.

## Weaknesses (the gaps to close)

1. **HeroBand currently uses CSS gradients only** — no painterly art is wired in yet. The 4 scenes you just generated need to actually appear. This is the #1 thing blocking visual identity.
2. **AgentHero is a placeholder** — comment in code: *"SVG glyph as ReactNode (Odin rune, Fenrir paw, etc) — placeholder until real art lands"*. Your sigils need to land.
3. **No command palette / `⌘K`** — every modern operator tool has this. Linear, Raycast, Vercel, Notion, Stripe all converge. Currently missing.
4. **No `G+letter` jump shortcuts** — operator dashboards live or die by keyboard. Linear's pattern is the standard.
5. **PromptBar is a `console.info` stub** per the codex handoff doc — not yet a real input. Easemize AI Prompt Box on 21st.dev is the upgrade.
6. **No replay/scrub timeline for agent sessions** — Manus's killer feature. You have sessions; you don't have replay.
7. **No `prefers-reduced-motion` audit** documented anywhere — your design language mentions it but I'd want to verify every animated component honors it.
8. **Loading states aren't ritualized** — should be Apple-shimmer skeletons (per spec) but also a one-time rune-ignition first-load.
9. **No edit-mode toggle on dashboards** — PostHog pattern. Without it, drag-and-drops happen by accident.
10. **5 agent colors may not be deployed with discipline** — every research stream warned against "Christmas tree" syndrome. Audit: does your current home page light up all 5 accent colors simultaneously? If yes, refactor to "one accent owns this surface."

## The risks I see

1. **Codex is implementing alone right now** — you said design critique split, but make sure the painterly art assets actually get wired in. Without that, the dashboard's visual identity is invisible.
2. **The Yggdrasil v2 SVG centerpiece is a single point of failure** — it's a hand-illustrated vector that needs an external commission. Until it lands, `/skills` will look incomplete. Consider: use **Celestial Sphere Shader** (Dhiluxui) as an interim v1.5 placeholder that doesn't *look* like a placeholder.
3. **You have 21 MCPs + 270 skills but no surface to manage them in the dashboard yet.** This is a HUGE opportunity — the Skill marketplace pattern from Claude Code Skills could become a `/skills` (Yggdrasil) route.
4. **Bento layout drift risk**: your DomainRow is a uniform grid. 2025 trend is asymmetric bento (one big card + smaller satellites). Audit whether uniform is intentional or just default.

---

# Part 3 — Cross-cutting patterns (every source agreed)

These showed up in 3 or 4 of the 4 research streams. Treat as design law.

## 1. Three-panel layout for agent work
**Left** = nav / list of agents/sessions.
**Middle** = conversation / work surface.
**Right** = live preview / artifact / "what the agent is doing."

Source convergence: Manus AI, Cursor 2.0+, Claude.ai (chat + artifact split), Bolt.new, v0.app, Devin all use this. Your `/lebot-james`, `/thor`, `/perseus`, `/fenrir`, `/sauron` agent routes should follow this.

**Norse translation**: Sidebar / Saga column / **Scrying Pool** (right panel showing what the agent sees).

## 2. Single accent color discipline
Linear's 2025 refresh stripped color aggressively (Neon Lime `#e4f222` only). Vercel uses black/white/single accent. Raycast uses white pill as universal CTA.

**For Woody's Realm**: pick ONE accent that owns each surface. Trading panel = Thor blue. Persona pages = that agent's accent. Activity stream = neutral. Doctor panel = state-dependent (gold OK, blood crit). NEVER light all 5 agent accents on the home page simultaneously.

## 3. Sub-200ms response budget
Raycast: "think in milliseconds." 2025 expectation: every interaction <200ms or feels broken.

**For Woody's Realm**: audit your hover, focus, click feedback. If any micro-interaction takes longer than 200ms to *respond* (even before completing), it feels laggy.

## 4. Skeleton screens, never spinners
Stripe, Linear, Notion, Claude.ai converge. Content-shaped placeholders with subtle shimmer feel ~30% faster than spinners.

**For Woody's Realm**: your design doc already specifies Apple-shimmer skeletons — verify Codex implemented them.

## 5. Status pills with BOTH color + icon (or rune)
Linear, Vercel, Cursor — never color-only (accessibility), never icon-only (scanability). Always both.

**For Woody's Realm**: Norse runes are perfect for this. ᚱ (rising/active) ᛏ (tasked/working) ᛞ (done) ᛪ (blocked) — color + rune together.

## 6. Real-time log streaming inline (not buried in a tab)
Vercel, Bolt, Cursor — logs appear in the source card, not in a separate "Logs" tab you have to navigate to.

**For Woody's Realm**: DoctorPanel should stream check output INLINE under each check, expandable. Don't hide behind a "View logs" button.

## 7. Replay/scrub timeline for sessions
Manus pioneered, Devin and Replit followed. Long-running agent sessions become products you can share.

**For Woody's Realm**: every background agent session should have a scrub bar + "Send the Raven" share button (encrypted share link).

## 8. Editable plan card before execution
Devin's Interactive Planning, Replit Agent 4's clarification card, Copilot Workspace's 4-stage scaffolding. Agent drafts plan → user edits → execution begins. Builds trust massively.

**For Woody's Realm**: when an agent receives a non-trivial task, surface a **Counsel Scroll** card — agent's draft plan, editable, with "Accept" / "Edit" / "Cancel" actions before any tool fires.

## 9. Tool-call transparency with destructive-action approval
Cursor, Devin, Copilot, Manus — every tool invocation visible; destructive ones (file delete, push, payment) require explicit approval. Non-destructive ones auto-run.

**For Woody's Realm**: align with your existing rules (your `web/coding-style.md` already forbids `--no-verify`, etc.) — surface this in the UI too.

## 10. Pre-baked atmospheric video over live shaders
Lusion v3 (Awwwards SOTY 2023) baked their Beethoven bust to MP4 instead of running Redshift in browser. Same for igloo.inc volumetric scenes. The lesson: render once, loop forever.

**For Woody's Realm**: your 4 time-of-day painterly scenes should ship as 10-15s looping WebM (2-3 MB each), NOT live shaders. Way better performance, identical visual.

---

# Part 4 — Component-by-component recommendations

For each of your existing components, the highest-impact upgrades found in research.

## `HeroBand.tsx` (currently gradient-only)

**Status**: Most impactful single upgrade — your painterly assets exist but aren't loaded.

**Recommended changes (in order)**:
1. **Wire in your 4 time-of-day painterly scenes** (`dawn-asgard.png`, `day-olympus.png`, `dusk-mordor.png`, `night-yggdrasil.png`) as the `<video>` or `<img>` source per hour bucket. Cross-dissolve at hour boundary with 1200ms ease.
2. **Add Aurora Background (Aceternity)** as a translucent layer over the scene → https://21st.dev/community/components/aceternity/aurora-background/default — tune stops to match current scene's accent
3. **Add Spotlight (Aceternity, "New" variant)** above HeroBand for Iron Man HUD overhead-key-light → https://21st.dev/community/components/aceternity/spotlight-new/default
4. **Add subtle Particles (Magic UI)** for drifting embers (your series signature) → https://21st.dev/community/components/magicui/particles — keep particle count LOW (~30), high-quality particles per 2025 trend
5. **Cinematic Landing Hero structural reference** → https://21st.dev/community/components/easemize/cinematic-landing-hero/default

**Norse translation**: This becomes the **Bifröst Welcome** — the bridge to the realm awakens with the painterly scene of the hour, aurora flowing through, embers drifting.

---

## `Sidebar.tsx`

**Recommended changes**:
1. **Hover-to-expand pattern** if not already there → https://21st.dev/community/components/aceternity/sidebar
2. **Replace generic icons with the agent sigils** (your painterly Sauron/Fenrir/Thor/Perseus/Lebron 1:1 sigils) — at 32px these become tiny stylized portraits
3. **Vegvísir sigil at top stays** — but consider adding subtle 4s ease infinite rune-glow animation (your existing motion spec)
4. **Status dots on agent items**: ᚱ (active) / ᛏ (tasked) / ᛞ (done) / ᛪ (blocked) — color + rune together (cross-cutting pattern #5)
5. **G+letter shortcut hints** appear on hover next to each item (Linear pattern: small monospace kbd chip on the right)

---

## `PulseStrip.tsx` (status bar)

**Recommended upgrades**:
1. **KPI Card (basic variant) from Nayan_radadiya6** → https://21st.dev/community/components/nayan_radadiya6/kpi-card/basic-kpi-card — for each cell
2. **Spotlight Card (Hextaui)** for hover acknowledgement on each cell → https://21st.dev/community/components/hextaui/spotlight-card/default
3. **Waveform-as-pulse** (steal from ElevenLabs) — instead of a flat strip, render system activity as a slow EKG waveform. Differentiator.
4. **Quiet idle pulse** (~2% brightness shift, 3s loop) — save intensity for real activity

---

## `NextActionCard.tsx` + `SessionGlyph.tsx`

**Recommended upgrades**:
1. **Glowing Effect Card (Aceternity)** wrap → https://21st.dev/community/components/aceternity/glowing-effect-card — set `--glow-color` to current active agent's accent
2. **Border Beam (Badtzx0)** triggered when an agent is processing → https://21st.dev/community/components/badtzx0/border-beam — "this card is actively working" signal
3. **Celestial Sphere Shader (Dhiluxui)** as SessionGlyph background → https://21st.dev/community/components/dhiluxui/celestial-sphere-shader/default — closest thing to Yggdrasil placeholder until v2 SVG lands

---

## `AgentHero.tsx` (placeholder right now)

**Recommended upgrades**:
1. **Wire in the actual painterly 16:9 hero render** for each agent (Thor bg pic, Perseus bg, Fenrir bg, Sauron bg, Lebron true bg / regenerated #67)
2. **Border Beam orbiting** when that agent is in-flight on a request
3. **Avalon Lost portrait-frame pattern** from Dribbble (https://dribbble.com/shots/26046805-Avalon-Lost-Dark-Medieval-RPG-UI-UX-Game-Art) — ornate frame ONCE around the portrait, stat bars below for token usage / conversation count / last active
4. **Glow Hero Section (Dhileepkumargm)** structural reference for atmospheric hero treatment

---

## `PromptBar.tsx` (currently a `console.info` stub)

**Recommended replacement**:
1. **AI Prompt Box (Easemize)** → https://21st.dev/community/components/easemize/ai-prompt-box/default — production-grade textarea + attachment icon + model selector chip + send
2. **Agent selector chip row** at the bottom of the input (👑 Lebot · ⚡ Thor · 💰 Perseus · 🐺 Fenrir · 👁 Sauron) — your design doc specifies this
3. **Gradient AI Chat Input (Isaiahbjork)** focus state → https://21st.dev/community/components/isaiahbjork/gradient-ai-chat-input — animated gradient ring intensifies on focus, magical feel
4. **Voice trigger keyword** (Cursor pattern) — settings option to submit prompt on "go" or "ship it" verbally

---

## `ActivityStream.tsx` (Heimdall's Watch)

**Recommended upgrades**:
1. **Timeline (Hextaui)** structural reference → https://21st.dev/community/components/hextaui/timeline/default
2. **Three-bucket grouping** per Linear Inbox: **Omens** (urgent), **Tidings** (updates), **Echoes** (silent activity)
3. **Real-time log streaming inline** (cross-cutting pattern #6) — each event card expandable to show full log
4. **Scrub timeline** at the top — drag to filter to a specific time window

---

## `DoctorPanel.tsx`

**Recommended upgrades**:
1. **Cybersecurity Dashboard pattern** from Ronas IT → https://dribbble.com/shots/16282459-Cybersecurity-Dashboard — war-room status grid + alert column
2. **AI Thinking Block (Preetsuthar17)** for live system-check disclosure → https://21st.dev/community/components/preetsuthar17/ai-thinking-block
3. **Inline log streaming** under each check (cross-cutting pattern #6)
4. **State-dependent accent** — green at peace, gold at watch, blood at storm

---

## `TradingPanel.tsx`

**Recommended upgrades**:
1. **IBM Plex Mono for ALL numbers** (cross-cutting pattern #9) — TradingView standard
2. **4-card KPI strip at top** (Stripe pattern) — P&L / win rate / exposure / regime
3. **Fintech Dashboard reference** from Dmitry Lauretsky → https://dribbble.com/shots/15120400-Fintech-Dashboard-Dark-Theme-User-Interface
4. **Density toggle** — operator pref that affects spacing/padding/row-height globally (TradingView pattern)
5. **Real sparklines, not fake fills** (Dribbble 2025 trend) — viewers spot fake data instantly

---

# Part 5 — NEW components to add (with exact URLs)

Highest-leverage 21st.dev components NOT yet in your dashboard. Direct links so you can browse + install.

## Atmospheric / background layer

| Component | URL | Use case |
|---|---|---|
| Aurora Background | https://21st.dev/community/components/aceternity/aurora-background/default | DAWN scene + HeroBand layer |
| Beams Background | https://21st.dev/community/components/kokonutd/beams-background/default | DAY scene (intensity prop maps to mode) |
| Meteors | https://21st.dev/community/components/aceternity/meteors | DUSK scene (Múspell embers) |
| Shooting Stars | https://21st.dev/community/components/aceternity/shooting-stars/default | NIGHT scene |
| Spotlight (New) | https://21st.dev/community/components/aceternity/spotlight-new/default | HeroBand overhead light |
| Particles (Magic UI) | https://21st.dev/community/components/magicui/particles | Series-signature drifting embers |
| Celestial Sphere Shader | https://21st.dev/community/components/dhiluxui/celestial-sphere-shader/default | Yggdrasil v1.5 placeholder + SessionGlyph |

## Card / panel treatments

| Component | URL | Use case |
|---|---|---|
| Glowing Effect Card | https://21st.dev/community/components/aceternity/glowing-effect-card | Agent tiles, DomainRow cells (per-agent `--glow-color`) |
| Spotlight Card (Hextaui) | https://21st.dev/community/components/hextaui/spotlight-card/default | Lighter hover cards for dense panels |
| Border Beam | https://21st.dev/community/components/badtzx0/border-beam | Agent processing indicator |
| Glowing Background Stars Card | https://21st.dev/community/components/aceternity/glowing-background-stars-card | TodaysWyrd strip cells |

## Bento / layout

| Component | URL | Use case |
|---|---|---|
| Scrapbook Bento Grid | https://21st.dev/community/components/dhiluxui/scrapbook-bento-grid/default | Painterly bento (matches your art aesthetic) |
| Aurora Bento Grid | https://21st.dev/dhileepkumargm/aurora-bento-grid | Home page bento upgrade |

## Agent communication

| Component | URL | Use case |
|---|---|---|
| Animated Beam | https://21st.dev/community/components/dillionverma/animated-beam | Agent-to-agent connection lines on home, Yggdrasil branches in v2 |
| AI Prompt Box | https://21st.dev/community/components/easemize/ai-prompt-box/default | PromptBar replacement |
| Gradient AI Chat Input | https://21st.dev/community/components/isaiahbjork/gradient-ai-chat-input | PromptBar focus state |
| AI Thinking Block | https://21st.dev/community/components/preetsuthar17/ai-thinking-block | v2 chat surfaces + DoctorPanel live checks |

## Operator / power-user

| Component | URL | Use case |
|---|---|---|
| CommandPalette | https://21st.dev/community/components/dhileepkumargm/command-palette | `⌘K` global command palette — non-negotiable |
| Sidebar (Aceternity) | https://21st.dev/community/components/aceternity/sidebar | Sidebar collapse/expand reference |
| File Viewer (Bankkroll) | https://21st.dev/community/components/bankkroll/file-viewer | Skills (`/skills` Yggdrasil route) browser |
| Dashboard Activities | https://21st.dev/community/components/uniquesonu/dashboard-activities | ActivityStream pattern reference |

---

# Part 6 — Sites to study (study these in your browser when you return)

## Tier 1 — open these first, screenshot, mood board

| Site | URL | Why |
|---|---|---|
| Igloo Inc | https://igloo.inc | Awwwards SOTY 2024. Closest existing analog to Woody's Realm. Two-color discipline, volumetric WebGL hero. |
| Linear (2025 refresh) | https://linear.app/now/behind-the-latest-design-refresh | The bible for restrained dark dashboard density |
| Cursor 2.0 changelog | https://cursor.com/changelog/2-0 | Agents-as-first-class-sidebar pattern (exactly your council concept) |
| Manus AI | https://manus.im | Three-panel "Manus's Computer" — model for your Scrying Pool |
| Lovable.dev | https://lovable.dev | Visual Edits + dual-mode (Counsel/Quest) |
| Anthropic Console | https://console.anthropic.com/workbench | Forge pattern — parameters next to surface they affect |
| Raycast | https://www.raycast.com | ActionPanel pattern, command palette gold standard |
| Persepolis Reimagined (Getty) | https://www.getty.edu/persepolis | Mythic narrative WebGL — closest reference for "Norse/LOTR/Theros" feeling on the web |

## Tier 2 — study after Tier 1

| Site | URL | Why |
|---|---|---|
| Cartier Watches & Wonders 2025 | https://cartier-waw-0225.dev.60fps.fr | Dark luxury watchmaking-tier, editorial spacing rhythm |
| Lusion v3 | https://lusion.co | Pre-rendered hero centerpieces (technique reference) |
| Chris Foy | https://chrisfoy.tv | "Bleed type" cinematic display |
| Art Here 2025 (Richard Mille) | https://artprize-shadows.com | Light-as-content for time-of-day translation |
| KPR | https://kprverse.com | Atmospheric mythic developer SOTY 2022 |
| Lando Norris | https://landonorris.com | Site of the Year 2025 — energy density |
| ElevenLabs | https://elevenlabs.io | Waveform-as-status pattern |
| Polestar Cockpit UI | https://dribbble.com/shots/26353099-Polestar-Cockpit-UI-Interactive-Cockpit-3D-Motion-Interface | 3D motion in HeroBand |
| Avalon Lost (Dribbble) | https://dribbble.com/shots/26046805-Avalon-Lost-Dark-Medieval-RPG-UI-UX-Game-Art | **Mythic operator UI secret weapon** — portrait+HUD+stat-bar composition |

## Dribbble designers to follow weekly

| Designer | URL | Specialty |
|---|---|---|
| Virgil Pana | https://dribbble.com/virgilpana | "Agentic UX" specialist — highest-signal for your exact problem |
| Ronas IT (Dmitry Lauretsky) | https://dribbble.com/ronasit | Dark dashboards, fintech, cybersecurity — restraint + density |
| Halo Lab | https://dribbble.com/halolab | Top-1 Dribbble team, 7M monthly views |
| Raycast | https://dribbble.com/raycastapp | Best-in-class command bar / launcher |
| Sandro Ieva | https://dribbble.com/sieva | Multi-agent card layouts |
| Dhiluxui (21st.dev) | https://21st.dev/dhiluxui | Cosmic / painterly leaning components |

---

# Part 7 — 2025 trends to RIDE

These trends were called out by 3+ research streams. Lean into them.

1. **Aurora gradients** (grainy, blurred, multi-stop) — dominant 2025 trend. Apply via Aceternity Aurora or Paper Shaders.
2. **Bento layouts** still climbing — switch DomainRow from uniform grid to asymmetric bento (one large card + smaller satellites). Aligns with `https://21st.dev/community/components/dhiluxui/scrapbook-bento-grid/default`
3. **Painterly/handmade/imperfect elements** — your painterly Theros agents are perfectly on-trend. Add: hand-drawn UI flourishes (an inked underline on hover, a wax-seal toggle).
4. **97% layout** (edge-to-edge content, thin chrome only) — matches your operator-first pillar
5. **Real telemetry, not decorative numbers** — 2025 dashboards rejected fake data. Honor in PulseStrip.
6. **Liquid Glass surfaces in disciplined doses** — Apple iOS 26 HIG + Linear 2025 added a touch. ONLY for ephemeral overlays (palettes, popovers), NEVER bulk surfaces.
7. **Voice as first-class input** — Cursor 2.0+ leads. Add later as v2.
8. **Replay/share session timelines** — Manus pioneered. Sessions are products.
9. **Tool-call transparency** — every modern agent UI shows tool invocations visibly. Honor.
10. **Editable plan before execute** — Devin/Replit/Copilot pattern. Build trust.

# Part 7b — Trends to AVOID

Every research stream flagged these as overused/dated/anti-brand for your aesthetic.

1. ❌ **Generic centered hero + gradient blob + CTA** — banned by your own rules; nobody wins Awwwards with this anymore
2. ❌ **Glassmorphism on every surface** — reserve for overlays only
3. ❌ **Cool-gray neutral dashboards** — reads as 2021 SaaS
4. ❌ **5 accent colors lit simultaneously** — Christmas tree dashboard
5. ❌ **Neon cyan/magenta cyberpunk combos** — wrong mythology
6. ❌ **The four-pointed sparkle ✨ as "AI" icon** — overused everywhere. Replace with rune-glyphs.
7. ❌ **Cinzel for body copy** — chisel font, ritual moments only
8. ❌ **Animated decorative particles INSIDE data zones** — particles belong in ambient hero only
9. ❌ **Default shadcn dark-card grids without modification** — looks like every v0 clone
10. ❌ **Spinners** — skeleton screens always
11. ❌ **Hover states that just change color** — Awwwards 2025 winners add motion/depth/sound, never just color
12. ❌ **Aceternity 3D Card Flip / 3D Pin / Evervault Card / Tracing Beam** — too iconic to specific other products
13. ❌ **Sparkles Text / Animated Shiny Text / Smooth Cursor (Magic UI)** — instant template-tell
14. ❌ **Dynamic Island / Dock pastiches** — Apple-iOS-cosplay, anti-Norse
15. ❌ **Floating gradient orb backgrounds** — overused 2023-2024; your painterly scenes beat them

---

# Part 8 — Concrete build order (15-step plan)

If I were sequencing Codex's work to maximize visual ROI per hour of implementation:

### Phase 1 — Visual identity unlock (4 hours)
1. **Wire the 4 time-of-day painterly scenes into HeroBand** — biggest single visual change
2. **Wire each agent's 16:9 painterly hero into AgentHero** (replace SVG glyph placeholder)
3. **Wire each agent's 1:1 sigil into Sidebar** (replace generic icons)
4. **Pre-bake the 4 scenes as 10s WebM loops** (optional ambient motion)

### Phase 2 — Component upgrades (6 hours)
5. **Install Aurora Background (Aceternity)** + tune to palette → drop behind HeroBand as the translucent atmospheric layer
6. **Wrap DomainRow cells in Glowing Effect Card** with per-agent `--glow-color` CSS var
7. **Add Border Beam to AgentHero** triggered on in-flight requests
8. **Replace PromptBar with AI Prompt Box (Easemize)** + add agent selector chip row at the bottom
9. **Add CommandPalette (Dhileepkumargm)** globally — wire to route map + agent invocations

### Phase 3 — Foundations (4 hours)
10. **Add IBM Plex Mono** as 4th font → migrate all numbers (TradingPanel, PulseStrip, NextActionCard timestamps)
11. **Implement `G+letter` shortcuts** — `G H` home, `G T` trading, `G A` Allthing, `G D` Doctor, `G R` Raven Tally, `G M` Mímir's Well
12. **Implement ActionPanel pattern** on every list item — `K` shortcut reveals all available actions
13. **Refactor notifications into three buckets** (Omens / Tidings / Echoes)

### Phase 4 — Differentiators (6 hours)
14. **Loading-as-ritual** — 1.5s Norse rune-ignition sequence on first session, cached after
15. **Plan-before-execute Counsel Scroll** — when agent receives non-trivial task, surface editable plan card with Accept/Edit/Cancel before tool calls fire

### Phase 5 — v1.5 / v2 candidates (deferred)
- Replay/scrub timeline on agent sessions
- Visual Edits on agent output (Lovable pattern)
- Voice trigger keywords on PromptBar (Cursor pattern)
- Yggdrasil v2 SVG centerpiece (commission illustrator)

---

# Part 9 — The Norse vocabulary expansion (new terms from this research)

Your DESIGN-LANGUAGE.md has the locked glossary. Here are additions that emerged from research recommendations, in Norse spirit, that I would propose for your review:

| English concept | Proposed Norse term | Source pattern |
|---|---|---|
| Agent roster sidebar | **The Allthing** | Cursor agents-as-objects |
| Live agent work view | **Scrying Pool** | Manus's Computer |
| Notifications grouping | **Raven Tally** | Linear Inbox (3 buckets: Omens / Tidings / Echoes) |
| Plan-before-execute card | **Counsel Scroll** | Devin Interactive Planning |
| Multi-agent compare view | **Council of Three** | Cursor 3.0 `/best-of-n` |
| Session worktree branch | **Skard** (saga branch) | Cursor `/worktree` |
| Right-pane chat/code/preview/log tabs | **Forge / Mirror / Smoke / Embers** | Bolt.new tabbed right pane |
| Export agent reply as skill | **Carve to Runestone** | Anthropic Console "Export as code" |
| Session share link | **Send the Raven** | Manus session share |
| Mode toggle on PromptBar | **Counsel** (thinking) vs **Quest** (autonomous) | Lovable chat/agent modes |
| ActionPanel on list items | **Choices Before the Norns** | Raycast ActionPanel |
| 4-stage agent workflow | **Listen → Counsel → Smith → Test** | Copilot Workspace stages |
| Settings drawer | **Smith's Drawer** | Bolt.new corner drawer |
| Agent processing visual | **Quest in Motion** (Border Beam orbit) | 21st.dev Border Beam |
| Per-project context container | **Hall** | Claude Projects |
| Recent sessions group | **Recent Sagas** | Claude.ai sidebar |
| Saved generated content | **Loomings** | Claude.ai Artifacts |

**You should NOT use all of these.** Pick the 4-6 that resonate; reject the rest. The Allthing, Raven Tally, Counsel Scroll, Scrying Pool, Send the Raven, and Choices Before the Norns are my strongest proposals.

---

# Part 10 — Honest self-assessment of this research

## What this research is good at

- Cross-validating patterns (anything that showed up in 3+ streams = strong signal)
- Mapping specific 21st.dev components to your exact components
- Identifying gaps in your current implementation
- Providing concrete URLs for follow-up

## What this research is weak at

- **Dribbble blocks scrapers** — research agent got URLs and titles but couldn't see visual content. You'll need to open the URLs yourself to verify the visual matches expectations.
- **Awwwards SOTY winners SKEW PORTFOLIO/BRAND, not operator UIs** — research agent confirmed no canonical Awwwards-winning operator dashboard exists. This is opportunity (you could be the first) but also means we're stretching analogies.
- **Some 21st.dev components require Tailwind v4** — your stack is 3.4. Most copy-paste works but config-level features may break. Codex needs to audit each install.
- **Real performance impact unverified** — 21st.dev components look great but stacking 3+ shader/canvas backgrounds will hit GPU. Profile before committing.
- **No actual Codex-side time estimate** — phase hours above are rough. Real implementation always has surprises.

## What I'd want to research next (if you ask me to keep going)

1. **Sound design** — every Tier 1 awards winner has audio. What's the right ambient bed for a Norse operator OS?
2. **Mobile / responsive strategy** — current research is desktop-only. Does Woody's Realm need a phone surface?
3. **Onboarding ritual** — first-session-ever experience. Should there be a "the realm awakens" sequence?
4. **Easter eggs** — the best operator tools (Raycast, Linear, GitHub) hide playful Easter eggs. What should Woody's Realm hide?
5. **Personalization beyond name** — birthday greetings are step 1. What about: realm-status visualizations based on actual mood (active commits = realm awakening), seasonal art shifts (frost on Yggdrasil in winter)?

---

# Appendix A — Raw research outputs

The four research agents produced ~700KB of raw research. I've synthesized the highest-signal recommendations above, but if you want to dive deeper into any specific area, the full agent outputs are preserved in this session transcript and contain:

- **21st.dev**: 30+ component URLs not in the synthesis, full author profiles, install workflow notes
- **Awwwards**: 20+ Tier 1/2 site URLs with breakdowns, typography combo alternatives, 8 cinematic hero patterns
- **Dribbble**: 25+ designer profiles, shot URLs by component type, agentic UX skill taxonomy
- **Production tools**: keyboard shortcut tables, exact pixel measurements (Linear's -0.22 letter-spacing, 6px universal radius), 13 cross-cutting patterns

Any time you want the raw text, just ask "show me the full [21st.dev/Awwwards/Dribbble/production] research" and I'll surface it.

---

# Appendix B — Source URLs ledger (master list)

**Component libraries**
- 21st.dev — https://21st.dev
- shadcn.io — https://shadcn.io
- Aceternity UI — https://ui.aceternity.com
- Magic UI — https://magicui.design
- Kokonut UI — https://kokonutui.com
- Paper Shaders — https://paper-design-shaders.mintlify.app

**Award sites**
- Awwwards SOTY 2025 — https://www.awwwards.com/annual-awards-2025/site-of-the-year
- Awwwards Dark Mode Collection — https://www.awwwards.com/awwwards/collections/dark-mode/

**Inspiration profiles**
- Virgil Pana (Dribbble) — https://dribbble.com/virgilpana
- Ronas IT (Dribbble) — https://dribbble.com/ronasit
- Halo Lab (Dribbble) — https://dribbble.com/halolab
- Raycast (Dribbble) — https://dribbble.com/raycastapp
- Dhiluxui (21st.dev) — https://21st.dev/dhiluxui
- Aceternity (21st.dev) — https://21st.dev/aceternity
- Magic UI (21st.dev) — https://21st.dev/magicui

**Production references**
- Cursor 2.0 changelog — https://cursor.com/changelog/2-0
- Cursor 3.0 changelog — https://cursor.com/changelog/3-0
- Linear 2025 refresh — https://linear.app/now/behind-the-latest-design-refresh
- Linear Inbox docs — https://linear.app/docs/inbox
- Anthropic Workbench — https://console.anthropic.com/workbench
- Manus AI — https://manus.im
- Lovable — https://lovable.dev
- Bolt — https://bolt.new
- v0 — https://v0.app
- Replit Agent — https://replit.com/agent4
- Devin — https://cognition.ai
- Vercel Dashboard — https://vercel.com/dashboard
- Raycast — https://www.raycast.com
- TradingView — https://tradingview.com

---

**End of synthesis. ~700KB of research distilled to ~30 pages of actionable recommendations matched specifically to Woody's Realm.**

Welcome back from work. 🐺
