import OdysseusEmbed from '@/components/OdysseusEmbed';
import { ODYSSEUS_URL } from '@/lib/odysseus';

export const dynamic = 'force-dynamic';

export default function OdysseusPage() {
  return (
    <div className="flex h-screen flex-col bg-bg-deep">
      {/* Threshold header — mythic portal frame above the workspace */}
      <header className="relative flex shrink-0 items-center justify-between border-b border-border-subtle bg-bg-panel/70 px-6 py-3 backdrop-blur-sm">
        {/* Threshold lintel glow — a very faint gold bloom at the border bottom */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rune-gold/45 to-transparent"
        />
        {/* Ambient deep bloom behind the header — left gold, right bifrost */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_50%,oklch(var(--color-rune-gold)_/_0.06),transparent_50%),radial-gradient(ellipse_at_85%_50%,oklch(var(--color-bifrost)_/_0.05),transparent_50%)]"
        />

        <div className="relative flex items-center gap-4">
          <div>
            <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">WORKSPACE · GATEWAY</div>
            <h1
              className="font-display text-xl text-rune-gold"
              style={{ textShadow: '0 0 20px oklch(var(--color-rune-gold) / 0.25)' }}
            >
              Odysseus
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-bifrost/30 bg-bifrost/10 px-3 py-1">
            <span className="h-1.5 w-1.5 animate-ember-pulse rounded-full bg-bifrost shadow-[0_0_5px_rgba(120,160,255,0.6)]" />
            <span className="font-mono text-[10px] tracking-wider text-bifrost">EVERY MODEL · EVERY DEVICE</span>
          </div>
        </div>

        <div className="relative flex items-center gap-3 font-mono text-[10px] text-text-muted">
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
