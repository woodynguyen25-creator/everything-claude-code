'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'glow' | 'shimmer';
type Size = 'sm' | 'md' | 'lg';

interface RuneButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

/**
 * RuneButton — Norse-luxury button inspired by 21st.dev / Aceternity patterns.
 *
 * Variants:
 *   primary  — solid rune-gold, used for primary CTAs (mod-cta equivalent)
 *   ghost    — bordered transparent, used for secondary actions
 *   glow     — primary + animated outer glow on hover
 *   shimmer  — animated gradient border traveling around the button
 */
export function RuneButton({
  variant = 'ghost',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  children,
  disabled,
  className,
  ...rest
}: RuneButtonProps) {
  const classes = [
    'rune-btn',
    `rune-btn--${variant}`,
    `rune-btn--${size}`,
    loading ? 'rune-btn--loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {/* Shimmer + glow chrome layers — pure CSS, no JS */}
      {variant === 'shimmer' ? <span aria-hidden className="rune-btn__shimmer" /> : null}
      {variant === 'glow' ? <span aria-hidden className="rune-btn__glow" /> : null}

      <span className="rune-btn__inner">
        {loading ? (
          <span className="rune-btn__spinner" aria-hidden />
        ) : icon ? (
          <span className="rune-btn__icon">{icon}</span>
        ) : null}
        <span className="rune-btn__label">{children}</span>
        {iconRight && !loading ? <span className="rune-btn__icon-right">{iconRight}</span> : null}
      </span>

      <style jsx>{`
        .rune-btn {
          --rune-pad-y: 0.55rem;
          --rune-pad-x: 1.1rem;
          --rune-radius: 9px;
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: var(--rune-pad-y) var(--rune-pad-x);
          border-radius: var(--rune-radius);
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          border: 1px solid transparent;
          background: transparent;
          color: oklch(var(--color-text-primary));
          transition:
            background 200ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 200ms cubic-bezier(0.22, 1, 0.36, 1),
            color 200ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1);
          overflow: hidden;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .rune-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rune-btn:not(:disabled):active {
          transform: scale(0.985);
        }

        /* ── Sizes ──────────────────────────────────────────── */
        .rune-btn--sm {
          --rune-pad-y: 0.35rem;
          --rune-pad-x: 0.75rem;
          font-size: 0.75rem;
        }
        .rune-btn--lg {
          --rune-pad-y: 0.75rem;
          --rune-pad-x: 1.5rem;
          font-size: 0.95rem;
        }

        /* ── Variant: primary ───────────────────────────────── */
        .rune-btn--primary {
          background: oklch(var(--color-rune-gold));
          color: oklch(20% 0.05 80);
          font-weight: 700;
          border-color: oklch(var(--color-rune-gold));
          box-shadow:
            0 1px 0 oklch(80% 0.13 80),
            0 1px 0 inset rgba(255, 255, 255, 0.18),
            0 -1px 0 inset rgba(0, 0, 0, 0.18);
        }
        .rune-btn--primary:not(:disabled):hover {
          background: oklch(80% 0.13 80);
          box-shadow:
            0 6px 18px -6px oklch(var(--color-rune-gold) / 0.5),
            0 1px 0 inset rgba(255, 255, 255, 0.22),
            0 -1px 0 inset rgba(0, 0, 0, 0.18);
          transform: translateY(-1px);
        }

        /* ── Variant: ghost ─────────────────────────────────── */
        .rune-btn--ghost {
          background: oklch(var(--color-bg-panel) / 0.6);
          border-color: oklch(var(--color-border-subtle));
          color: oklch(var(--color-text-secondary));
        }
        .rune-btn--ghost:not(:disabled):hover {
          border-color: oklch(var(--color-rune-gold) / 0.5);
          color: oklch(var(--color-rune-gold));
          background: oklch(var(--color-bg-raised) / 0.8);
        }

        /* ── Variant: glow ──────────────────────────────────── */
        .rune-btn--glow {
          background: oklch(var(--color-rune-gold));
          color: oklch(20% 0.05 80);
          font-weight: 700;
          border-color: oklch(var(--color-rune-gold));
        }
        .rune-btn--glow .rune-btn__glow {
          position: absolute;
          inset: -2px;
          border-radius: calc(var(--rune-radius) + 2px);
          background: radial-gradient(
            circle at center,
            oklch(var(--color-rune-gold) / 0.5) 0%,
            transparent 70%
          );
          opacity: 0;
          transition: opacity 280ms ease;
          z-index: -1;
          filter: blur(8px);
        }
        .rune-btn--glow:not(:disabled):hover {
          transform: translateY(-1px);
        }
        .rune-btn--glow:not(:disabled):hover .rune-btn__glow {
          opacity: 1;
        }

        /* ── Variant: shimmer ───────────────────────────────── */
        .rune-btn--shimmer {
          background: oklch(var(--color-bg-panel));
          color: oklch(var(--color-rune-gold));
          border-color: transparent;
          z-index: 0;
        }
        .rune-btn--shimmer .rune-btn__shimmer {
          position: absolute;
          inset: 0;
          border-radius: var(--rune-radius);
          padding: 1px;
          background: conic-gradient(
            from var(--rune-angle, 0deg),
            transparent 0%,
            oklch(var(--color-rune-gold) / 0.6) 25%,
            transparent 50%,
            oklch(var(--color-bifrost) / 0.4) 75%,
            transparent 100%
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: rune-spin 3s linear infinite;
          z-index: -1;
        }
        .rune-btn--shimmer:not(:disabled):hover {
          color: oklch(80% 0.13 80);
          background: oklch(var(--color-bg-raised));
        }

        @keyframes rune-spin {
          0%   { --rune-angle: 0deg; transform: rotate(0deg); }
          100% { --rune-angle: 360deg; transform: rotate(360deg); }
        }

        /* Fallback if @property unsupported */
        @supports not (background: conic-gradient(from 0deg, red, red)) {
          .rune-btn--shimmer .rune-btn__shimmer {
            background: linear-gradient(
              90deg,
              transparent,
              oklch(var(--color-rune-gold) / 0.6),
              transparent
            );
            animation: rune-shimmer-fallback 3s linear infinite;
          }
        }
        @keyframes rune-shimmer-fallback {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* ── Inner layout ───────────────────────────────────── */
        .rune-btn__inner {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 1;
        }

        .rune-btn__icon,
        .rune-btn__icon-right {
          display: inline-flex;
          align-items: center;
          line-height: 0;
          opacity: 0.9;
        }

        .rune-btn__spinner {
          width: 0.9em;
          height: 0.9em;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          border-right-color: transparent;
          animation: rune-spin-loader 720ms linear infinite;
        }

        @keyframes rune-spin-loader {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .rune-btn,
          .rune-btn--shimmer .rune-btn__shimmer,
          .rune-btn--glow .rune-btn__glow {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </button>
  );
}
