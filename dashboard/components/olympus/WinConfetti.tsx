'use client';

import { forwardRef } from 'react';

export const WinConfetti = forwardRef<HTMLCanvasElement>(function WinConfetti(_, ref) {
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
});
