import InlineMarkdown from '@/components/InlineMarkdown';
import { readAiosStats } from '@/lib/aios-stats';

export default function DreamingSurfaces() {
  const dreams = readAiosStats()?.dreams ?? [];

  return (
    <section className="mx-12">
      <article className="panel p-6">
        <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">DREAMING SURFACES</div>
        {dreams.length ? (
          <ul className="mt-4 space-y-3 text-sm text-text-secondary">
            {dreams.map((dream) => (
              <li key={dream} className="rounded bg-bg-deep px-4 py-3">
                <InlineMarkdown text={dream} className="text-sm text-text-secondary" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 text-sm italic text-text-muted">The realm dreams quietly tonight.</div>
        )}
      </article>
    </section>
  );
}
