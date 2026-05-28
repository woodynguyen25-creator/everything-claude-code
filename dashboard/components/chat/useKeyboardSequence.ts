'use client';

import { useEffect, useRef } from 'react';

type SequenceMap = Record<string, () => void>;

export function useKeyboardSequence(sequences: SequenceMap, enabled = true) {
  const pendingRef = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const clearPending = () => {
      pendingRef.current = null;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.getAttribute('contenteditable') === 'true';
      if (typing) return;

      const key = event.key.toLowerCase();
      if (!pendingRef.current) {
        if (key === 'g') {
          pendingRef.current = 'g';
          timeoutRef.current = window.setTimeout(clearPending, 1500);
        } else if (sequences[key]) {
          event.preventDefault();
          sequences[key]();
        }
        return;
      }

      const sequence = `${pendingRef.current}${key}`;
      if (sequences[sequence]) {
        event.preventDefault();
        sequences[sequence]();
      }
      clearPending();
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearPending();
    };
  }, [enabled, sequences]);
}
