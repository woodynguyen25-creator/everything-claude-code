'use client';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-8">
      <div className="panel w-full max-w-xl p-8">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">REALM INTERRUPTION</div>
        <h1 className="mt-3 font-display text-3xl text-text-primary">The realm lost its footing.</h1>
        <p className="mt-4 text-sm text-text-secondary">
          A local data source or route failed to render. The shell is still intact — try again, or return once the
          underlying source is healthy.
        </p>
        <div className="mt-6 overflow-x-auto rounded bg-bg-deep px-4 py-3 font-mono text-xs text-text-muted">
          {error.message || 'Unknown error'}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded bg-rune-gold px-4 py-2 text-rune text-xs font-semibold tracking-wider text-bg-deep transition-colors hover:bg-rune-gold/90"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
