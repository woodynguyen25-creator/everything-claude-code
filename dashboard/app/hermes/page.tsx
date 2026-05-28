import HermesEmbed from '@/components/HermesEmbed';
import HermesChatPanel from '@/components/HermesChatPanel';

export const dynamic = 'force-dynamic';

const HERMES_BASE = process.env.HERMES_DASHBOARD_URL ?? 'http://100.78.199.123:9119';
const HERMES_PUBLIC = process.env.HERMES_PUBLIC_IP ?? '142.93.12.177';

export default function HermesPage() {
  return (
    <div className="flex h-screen flex-col bg-bg-deep">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-bg-panel/70 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">AUTOMATION · GATEWAY</div>
            <h1 className="font-display text-xl text-text-primary">Hermes Agent</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]" />
            <span className="font-mono text-[10px] tracking-wider text-emerald-400">LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-text-muted">
          <span>Droplet · NYC3 · {HERMES_PUBLIC}</span>
          <span className="text-white/20">|</span>
          <a
            href={HERMES_BASE}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer rounded border border-border-subtle px-2 py-0.5 transition-colors hover:border-rune-gold hover:text-rune-gold"
          >
            ↗ OPEN UI IN NEW TAB
          </a>
        </div>
      </header>

      {/* Split: native chat (left, narrower) + Hermes own UI (right, wider) */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[420px_1fr]">
        {/* Native chat panel — fast, integrated, talks directly to Hermes via SSH */}
        <aside className="overflow-hidden border-b border-border-subtle lg:border-b-0 lg:border-r">
          <HermesChatPanel />
        </aside>

        {/* Embedded Hermes web UI — sessions browser, config, kanban, full Hermes-native UX */}
        <main className="overflow-hidden">
          <HermesEmbed src={HERMES_BASE} />
        </main>
      </div>
    </div>
  );
}
