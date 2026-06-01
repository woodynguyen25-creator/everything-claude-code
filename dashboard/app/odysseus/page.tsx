import OdysseusEmbed from '@/components/OdysseusEmbed';
import { ODYSSEUS_URL } from '@/lib/odysseus';

export const dynamic = 'force-dynamic';

export default function OdysseusPage() {
  return (
    <div className="flex h-screen flex-col bg-bg-deep">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-bg-panel/70 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">WORKSPACE · GATEWAY</div>
            <h1 className="font-display text-xl text-text-primary">Odysseus</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-bifrost/30 bg-bifrost/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-bifrost shadow-[0_0_5px_rgba(120,160,255,0.6)]" />
            <span className="font-mono text-[10px] tracking-wider text-bifrost">EVERY MODEL · EVERY DEVICE</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-text-muted">
          <span>Droplet · Tailscale HTTPS</span>
          <span className="text-white/20">|</span>
          <a
            href={ODYSSEUS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer rounded border border-border-subtle px-2 py-0.5 transition-colors hover:border-rune-gold hover:text-rune-gold"
          >
            ↗ OPEN ON MOBILE / NEW TAB
          </a>
        </div>
      </header>

      {/* Full-bleed Odysseus workspace */}
      <main className="flex-1 overflow-hidden">
        <OdysseusEmbed src={ODYSSEUS_URL} />
      </main>
    </div>
  );
}
