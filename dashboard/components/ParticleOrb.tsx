'use client';

import { useEffect, useRef } from 'react';

export type OrbTone = 'gold' | 'emerald' | 'ember' | 'blood';

type ParticleOrbProps = {
  className?: string;
  /** particle count — keep under ~300 for cheap frames */
  count?: number;
  /** system-state color; transitions smoothly when it changes */
  tone?: OrbTone;
};

type P3 = { x: number; y: number; z: number };
type Lch = { l: number; c: number; h: number };

const ROTATION_SPEED = 0.00016; // rad/ms — slow, ambient
const WOBBLE = 0.22; // x-axis tilt amplitude
const EDGE_NEIGHBORS = 3; // links per particle (fixed topology, precomputed)
const TONE_LERP = 0.03; // per-frame approach rate toward target tone

// OKLCH per tone — orb color IS system state (idle gold / healthy-run emerald /
// degraded ember / fault blood).
const TONES: Record<OrbTone, Lch> = {
  gold: { l: 75, c: 0.13, h: 80 },
  emerald: { l: 62, c: 0.14, h: 155 },
  ember: { l: 70, c: 0.17, h: 50 },
  blood: { l: 60, c: 0.19, h: 25 },
};

/**
 * Ambient particle-network orb — the "living brain" centerpiece.
 * Fibonacci-sphere lattice, precomputed edge topology, slow Y rotation.
 * Canvas 2D only (no WebGL), ~250 points → trivially cheap per frame.
 * Honors prefers-reduced-motion by rendering a single static frame.
 */
export function ParticleOrb({ className = '', count = 240, tone = 'gold' }: ParticleOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toneRef = useRef<OrbTone>(tone);
  toneRef.current = tone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fibonacci sphere lattice — even coverage, no clumping at poles.
    const pts: P3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }

    // Precompute nearest-neighbor edges once — topology never changes.
    const edges: Array<[number, number]> = [];
    const seen = new Set<string>();
    for (let i = 0; i < count; i++) {
      const dists = pts
        .map((p, j) => ({ j, d: (p.x - pts[i].x) ** 2 + (p.y - pts[i].y) ** 2 + (p.z - pts[i].z) ** 2 }))
        .filter(({ j }) => j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, EDGE_NEIGHBORS);
      for (const { j } of dists) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push(i < j ? [i, j] : [j, i]);
        }
      }
    }

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Current color state — lerps toward the active tone each frame.
    const cur: Lch = { ...TONES[toneRef.current] };

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw(t: number) {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Ease current color toward the target tone (state transitions glow, not snap).
      const target = TONES[toneRef.current];
      cur.l += (target.l - cur.l) * TONE_LERP;
      cur.c += (target.c - cur.c) * TONE_LERP;
      cur.h += (target.h - cur.h) * TONE_LERP;
      const edgeColor = (alpha: number) => `oklch(${cur.l.toFixed(1)}% ${cur.c.toFixed(3)} ${cur.h.toFixed(1)} / ${alpha.toFixed(3)})`;
      const nodeColor = (alpha: number) =>
        `oklch(${(cur.l + 3).toFixed(1)}% ${(cur.c + 0.01).toFixed(3)} ${cur.h.toFixed(1)} / ${alpha.toFixed(3)})`;

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.42;
      const ay = t * ROTATION_SPEED;
      const ax = Math.sin(t * ROTATION_SPEED * 0.6) * WOBBLE;
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const f = 3.2; // perspective focal

      // Rotate + project every point once per frame.
      const proj: Array<{ sx: number; sy: number; depth: number }> = new Array(count);
      for (let i = 0; i < count; i++) {
        const p = pts[i];
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const s = f / (f + z2);
        proj[i] = { sx: cx + x1 * R * s, sy: cy + y2 * R * s, depth: (1 - z2) / 2 };
      }

      // Edges first — depth-faded hairlines.
      ctx.lineWidth = Math.max(0.5, 0.6 * dpr);
      for (const [a, b] of edges) {
        const d = (proj[a].depth + proj[b].depth) / 2;
        ctx.strokeStyle = edgeColor(0.04 + d * 0.14);
        ctx.beginPath();
        ctx.moveTo(proj[a].sx, proj[a].sy);
        ctx.lineTo(proj[b].sx, proj[b].sy);
        ctx.stroke();
      }

      // Nodes — brighter and larger when nearer.
      for (let i = 0; i < count; i++) {
        const { sx, sy, depth } = proj[i];
        ctx.fillStyle = nodeColor(0.15 + depth * 0.75);
        ctx.beginPath();
        ctx.arc(sx, sy, (0.6 + depth * 1.5) * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (reduced) {
      draw(12_000); // single static frame at a pleasing angle
    } else {
      const loop = (t: number) => {
        draw(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [count]);

  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} aria-hidden />;
}
