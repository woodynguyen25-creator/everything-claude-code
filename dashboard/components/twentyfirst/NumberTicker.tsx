'use client';

import { useEffect, useRef } from 'react';

export interface NumberTickerProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const defaultCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export function NumberTicker({
  value,
  format = defaultCurrency,
  className,
  duration = 800,
}: NumberTickerProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const from = prevRef.current;
    const to = value;

    if (reducedRef.current || from === to) {
      prevRef.current = to;
      el.textContent = format(to);
      return;
    }

    const t0 = performance.now();

    function tick(now: number) {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      const current = from + (to - from) * easeOut(progress);
      el!.textContent = format(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, format, duration]);

  return (
    <span ref={spanRef} className={className}>
      {format(value)}
    </span>
  );
}
