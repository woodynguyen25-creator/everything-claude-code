import { Suspense } from 'react';
import MemoryWellClient from '@/components/MemoryWellClient';

export default function MemoryPage() {
  return (
    <div className="px-12 py-12">
      <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">MEMORY</div>
      <h1 className="mt-2 font-display text-4xl text-rune-gold">Mimir's Well</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        What the wise know, others have forgotten. Drink and recall.
      </p>
      <Suspense
        fallback={
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="panel h-48 p-5">
                <div className="h-4 w-3/4 rounded bg-bg-deep shimmer" />
                <div className="mt-3 h-3 w-1/2 rounded bg-bg-deep shimmer" />
                <div className="mt-6 h-24 rounded bg-bg-deep shimmer" />
              </div>
            ))}
          </div>
        }
      >
        <MemoryWellClient />
      </Suspense>
    </div>
  );
}
