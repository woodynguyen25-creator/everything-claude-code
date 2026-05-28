# 21st.dev Integration Brief — Curated Subset

**Author:** Claude (design lead)
**For:** Codex (when implementing 21st.dev components into Woody's Realm)
**Status:** Plan locked. Implementation deferred to Codex Priority 5 (see `HANDOFF-TO-CODEX-2026-05-18-EVENING.md`).

---

## TL;DR

User saw 21st.dev components (Card, Button, Tabs, Input, Label, BorderBeam, TracingBeam) and wants them as inspiration. **Do not lift the whole kit.** Cherry-pick exactly **3 components** that fit Woody's Realm and skip the rest.

Approved subset:
1. **BorderBeam** — animated border glow for the active Council card
2. **TracingBeam** — vertical scroll-tracked beam for the home page
3. **Activity Rings** — Apple-Watch-style 3-ring component for Daily Rites panel

Skipped (existing `panel` class + button styles already on-brand):
- Card / CardHeader / CardTitle / CardDescription / CardContent / CardFooter
- Button (CVA-based)
- Tabs (Radix-styled)
- Input
- Label

---

## Why this subset

| Component | Fit verdict | Why |
|---|---|---|
| BorderBeam | **HIGH** | One subtle traveling glow on the active Council card = instant "this one is awake" signal without color shift. Matches the cinematic aesthetic. |
| TracingBeam | **HIGH** | Home page is a vertical saga (Council → Hoard/Forge/Daily Rites → ActivityStream). A scroll-tracked beam makes the page feel like one unspooling thread. Norse-coded perfectly. |
| Activity Rings | **HIGH** | Daily Rites panel is currently stubbed. Apple-Watch rings are famous, instantly readable, theme via CSS variables. Slots right in. |
| Card | LOW | We already have a `panel` utility doing better — lifting shadcn Card would *flatten* the brand. |
| Button | LOW | Existing button styling is intentional (rune-gold, ember, blood per hotness). CVA-based shadcn buttons would be generic. |
| Tabs | MEDIUM | Tempting for `/trading` focus mode. Defer until we genuinely need tabs somewhere. |
| Input | LOW | Existing input styling (dark with rune-gold focus border) is on-brand. |
| Label | LOW | Doesn't add value over existing patterns. |

---

## Dependencies to add

```bash
npm install class-variance-authority framer-motion
```

**Bundle impact:**
- `class-variance-authority` ~2KB gzipped — negligible
- `framer-motion` ~30-40KB gzipped — acceptable. Used for both BorderBeam (animated stroke) and TracingBeam (scroll-progress motion values).

**NOT installed (skipped from 21st.dev's typical kit):**
- `@radix-ui/react-slot`
- `@radix-ui/react-tabs`
- `@radix-ui/react-label`
- `tailwind-merge` (we use `clsx`-equivalent inline, not enough complexity to warrant it)
- `tw-animate-css` (we already have keyframes in globals.css and tailwind.config.ts)

---

## Component 1 — BorderBeam

**File:** `components/ui/BorderBeam.tsx`

**Reference patterns:**
- magicui's `border-beam` (dillionverma)
- Aceternity UI's `moving-border`

**Spec:**

```tsx
'use client';
import { motion } from 'framer-motion';

type BorderBeamProps = {
  size?: number;            // beam length (default 200)
  duration?: number;        // loop duration in seconds (default 6)
  borderWidth?: number;     // (default 1.5)
  colorFrom?: string;       // OKLCH color start (default rune-gold/0)
  colorTo?: string;         // OKLCH color peak (default rune-gold/0.8)
  delay?: number;           // (default 0)
  className?: string;
};

export function BorderBeam({
  size = 200,
  duration = 6,
  borderWidth = 1.5,
  colorFrom = 'oklch(82% 0.16 80 / 0)',
  colorTo = 'oklch(82% 0.16 80 / 0.8)',
  delay = 0,
  className = '',
}: BorderBeamProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 rounded-[inherit] [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(black,black)] ${className}`}
      style={{
        ['--size' as string]: size,
        ['--duration' as string]: duration,
        ['--anchor' as string]: 90,
        ['--border-width' as string]: borderWidth,
        ['--color-from' as string]: colorFrom,
        ['--color-to' as string]: colorTo,
        ['--delay' as string]: `-${delay}s`,
      }}
    >
      <motion.div
        className="absolute aspect-square bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent"
        style={{ width: 'calc(var(--size) * 1px)', offsetPath: 'rect(0 auto auto 0 round var(--size) * 1px)' }}
        animate={{ offsetDistance: ['0%', '100%'] }}
        transition={{
          duration: Number(duration),
          delay: Number(delay) * -1,
          ease: 'linear',
          repeat: Infinity,
        }}
      />
    </div>
  );
}
```

**Where to apply:**
- In `Sidebar.tsx`, wrap the **active** `AgentCard` with a `relative` container, place `<BorderBeam />` inside as a sibling to the card content.
- Only show on the active route's agent (check via `usePathname()`).
- Use the agent's accent color: pass `colorTo` based on the active agent's accent (gold for Lebot, bifrost for Thor, etc.).

**Visual checklist:**
- Beam travels along the *border* of the card, not inside.
- ~6s loop — fast enough to be alive, slow enough not to distract.
- Subtle: the peak alpha is 0.8, not 1.0. We want a whisper, not a beacon.
- Respects `prefers-reduced-motion` — wrap the entire BorderBeam render in a check:
  ```tsx
  const reduced = useReducedMotion();
  if (reduced) return null;
  ```

---

## Component 2 — TracingBeam

**File:** `components/ui/TracingBeam.tsx`

**Reference:** Aceternity UI's `tracing-beam`

**Spec:**

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

type TracingBeamProps = {
  children: React.ReactNode;
  className?: string;
};

export function TracingBeam({ children, className = '' }: TracingBeamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const [svgHeight, setSvgHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setSvgHeight(contentRef.current.offsetHeight);
    }
  }, []);

  const y1 = useSpring(useTransform(scrollYProgress, [0, 0.8], [50, svgHeight]), {
    stiffness: 500,
    damping: 90,
  });
  const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [50, svgHeight - 200]), {
    stiffness: 500,
    damping: 90,
  });

  return (
    <motion.div ref={ref} className={`relative mx-auto h-full w-full ${className}`}>
      <div className="absolute -left-4 top-3 md:-left-20">
        <motion.div
          transition={{ duration: 0.2, delay: 0.5 }}
          animate={{ boxShadow: scrollYProgress.get() > 0 ? 'none' : 'rgba(0, 0, 0, 0.24) 0px 3px 8px' }}
          className="ml-[27px] flex h-4 w-4 items-center justify-center rounded-full border border-border-subtle bg-bg-deep shadow-sm"
        >
          <motion.div
            transition={{ duration: 0.2, delay: 0.5 }}
            animate={{
              backgroundColor: scrollYProgress.get() > 0 ? 'oklch(15% 0 0)' : 'oklch(82% 0.16 80)',
              borderColor: scrollYProgress.get() > 0 ? 'oklch(15% 0 0)' : 'oklch(82% 0.16 80)',
            }}
            className="h-2 w-2 rounded-full border border-rune-gold bg-rune-gold"
          />
        </motion.div>
        <svg
          viewBox={`0 0 20 ${svgHeight}`}
          width="20"
          height={svgHeight}
          aria-hidden="true"
          className="ml-4 block"
        >
          <motion.path
            d={`M 1 0 V -36 l 18 24 V ${svgHeight * 0.8} l -18 24 V ${svgHeight}`}
            fill="none"
            stroke="oklch(40% 0.08 80 / 0.16)"
            strokeOpacity="0.16"
            transition={{ duration: 10 }}
          />
          <motion.path
            d={`M 1 0 V -36 l 18 24 V ${svgHeight * 0.8} l -18 24 V ${svgHeight}`}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="1.25"
            className="motion-reduce:hidden"
            transition={{ duration: 10 }}
          />
          <defs>
            <motion.linearGradient
              id="gradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={y1}
              y2={y2}
            >
              <stop stopColor="oklch(82% 0.16 80)" stopOpacity="0" />
              <stop stopColor="oklch(82% 0.16 80)" />
              <stop offset="0.325" stopColor="oklch(70% 0.18 35)" />
              <stop offset="1" stopColor="oklch(40% 0.04 240)" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </svg>
      </div>
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}
```

**Where to apply:**
- Wrap the entire home page content in `app/page.tsx`:
  ```tsx
  <TracingBeam className="px-0">
    <HeroBand />
    <PulseStrip />
    ...
  </TracingBeam>
  ```
- The beam will appear at the left edge of the canvas.

**Visual checklist:**
- Beam is **subtle** — uses our existing `rune-gold` and `ember`-tinted gradient.
- Dot at top brightens when user scrolls. Dims when at top.
- Hidden under `motion-reduce:hidden` per accessibility.
- Position: `-left-4 top-3` on mobile, `md:-left-20` on desktop (sidebar already eats left space; beam goes in the gutter).

---

## Component 3 — Activity Rings

**File:** `components/ui/ActivityRings.tsx`

**Reference:** Apple Watch Activity Rings (SVG-based, no library needed).

**Spec:**

```tsx
type Ring = {
  label: string;       // e.g. "Move", "Stand", "Exercise"
  value: number;       // current progress (0..max)
  max: number;         // target
  color: string;       // OKLCH or token-resolved color
};

type ActivityRingsProps = {
  rings: Ring[];        // 1–3 rings
  size?: number;        // SVG viewport size (default 180)
  strokeWidth?: number; // (default 14)
  gap?: number;         // gap between rings (default 4)
};

export function ActivityRings({
  rings,
  size = 180,
  strokeWidth = 14,
  gap = 4,
}: ActivityRingsProps) {
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((ring, i) => {
        const r = (size / 2) - strokeWidth / 2 - i * (strokeWidth + gap);
        const c = 2 * Math.PI * r;
        const pct = Math.min(1, ring.value / ring.max);
        const dash = c * pct;
        return (
          <g key={ring.label} transform={`rotate(-90 ${cx} ${cy})`}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={ring.color}
              strokeWidth={strokeWidth}
              strokeOpacity="0.15"
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={ring.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              style={{
                transition: 'stroke-dasharray 600ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}
```

**Where to apply:**
- Build a `DailyRitesPanel` component (currently a stub or not even created).
- Show 3 rings: e.g. *Move*, *Mind*, *Make* (Norse-themed re-names: *Body*, *Mind*, *Craft*).
- Color rings with existing tokens:
  - Outer (Body): `oklch(70% 0.18 35)` — ember-tinted (warm motion)
  - Middle (Mind): `oklch(75% 0.13 230)` — bifrost (cool focus)
  - Inner (Craft): `oklch(82% 0.16 80)` — rune-gold (the crown)

**Norse anchor strings (use from `norse-copy.json`):**
- Label: "TODAY'S RITES"
- Title: "Daily Rites"
- Subtitle: italic — *"Three offerings, kept faithfully."*
- Empty: *"No rites yet. Even the gods begin with one small offering."*

---

## Tailwind config additions

Add these animations to `tailwind.config.ts` under `theme.extend.keyframes` and `theme.extend.animation`:

```ts
keyframes: {
  // existing ember-pulse, rune-glow, session-breath
  'shimmer-slide': {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },
  'beam-travel': {
    '0%': { offsetDistance: '0%' },
    '100%': { offsetDistance: '100%' },
  },
},
animation: {
  // existing
  'shimmer-slide': 'shimmer-slide 2.4s ease-in-out infinite',
  'beam-travel': 'beam-travel 6s linear infinite',
},
```

---

## CSS additions (globals.css)

Add the shimmer utility (this is also Codex Priority 4):

```css
.shimmer {
  position: relative;
  overflow: hidden;
}
.shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    oklch(95% 0.02 80 / 0.04),
    transparent
  );
  animation: shimmer-slide 2.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .shimmer::after { animation: none; }
}
```

(Claude is also adding this in Tier B autonomous work — don't double-add. Check globals.css before adding.)

---

## Implementation order for Codex

1. Install deps: `npm install class-variance-authority framer-motion`
2. Add Tailwind keyframes/animations
3. Add shimmer CSS (if not already added by Claude — verify)
4. Build `BorderBeam.tsx`
5. Wire BorderBeam into Sidebar active AgentCard
6. Build `TracingBeam.tsx`
7. Wire TracingBeam into `app/page.tsx` (wrap existing content)
8. Build `ActivityRings.tsx`
9. Build minimal `DailyRitesPanel.tsx` placeholder using rings + Norse strings
10. Test all 3 in browser
11. Verify bundle size impact via `npm run build` (target: +50KB gzip total)
12. Write review doc

---

## Brand checklist before declaring done

- [ ] BorderBeam: visible only on active Council card. No double-beam. Respects reduced-motion.
- [ ] TracingBeam: visible on home page only. Doesn't fight with `AmbientEmbers`. Aligns with left gutter.
- [ ] Activity Rings: 3 rings, color-tokens match (ember/bifrost/rune-gold), animate on value change.
- [ ] No new gradients on cards.
- [ ] No new fonts loaded.
- [ ] No new colors outside the OKLCH palette.
- [ ] Cinzel used only on labels ≥24px (none of these components add display text below threshold).

---

## What to push back on if it doesn't feel right

This is inspiration, not gospel. If during implementation:
- BorderBeam feels too flashy → reduce `colorTo` alpha to 0.5 or duration to 8s
- TracingBeam fights with home page layout → drop it from page wrapping and apply only to memory/activity pages instead
- Activity Rings look generic → swap palette to single rune-gold ring with three tick marks (more Norse, less Apple)

Document any deviations in the review doc.
