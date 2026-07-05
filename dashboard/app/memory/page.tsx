import { Suspense } from 'react';
import MemoryWellClient from '@/components/MemoryWellClient';
import { PageShell } from '@/components/layout/PageShell';

export default function MemoryPage() {
  return (
    <PageShell title="Mimir's Well" eyebrow="Memory">
      <p className="max-w-2xl text-sm text-text-secondary">
        What the wise know, others have forgotten. Drink and recall.
      </p>

      <Suspense
        fallback={
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
    </PageShell>
  );
}
