'use client';

import { useEffect, useState } from 'react';

interface OdysseusEmbedProps {
  src: string;
}

// Embeds the Odysseus workspace (Droplet, via Tailscale Serve HTTPS) full-bleed.
// Falls back to a connect prompt if the iframe can't be reached within 4s
// (Tailscale offline, Serve not yet enabled, or the Droplet asleep).
export default function OdysseusEmbed({ src }: OdysseusEmbedProps) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'unreachable'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        await fetch(src, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timer);
        if (!cancelled) setStatus('ok');
      } catch {
        if (!cancelled) setStatus('unreachable');
      }
    };
    probe();
    return () => {
      cancelled = true;
    };
  }, [src, reloadKey]);

  if (status === 'unreachable') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
        <div className="max-w-md rounded-2xl border border-rune-gold/20 bg-rune-gold/[0.05] px-6 py-5 text-center">
          <div className="text-rune text-[10px] tracking-[0.3em] text-rune-gold">WORKSPACE WARMING</div>
          <h2 className="mt-2 font-display text-lg text-text-primary">Odysseus is unreachable</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Check that Tailscale is connected, the Droplet is awake, and HTTPS
            (Tailscale&nbsp;Serve) is enabled for the workspace.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStatus('loading');
                setReloadKey((k) => k + 1);
              }}
              className="cursor-pointer rounded border border-border-subtle px-3 py-1 font-mono text-[10px] tracking-wider text-text-secondary transition-colors hover:border-rune-gold hover:text-rune-gold"
            >
              ↻ RETRY
            </button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer rounded border border-border-subtle px-3 py-1 font-mono text-[10px] tracking-wider text-text-secondary transition-colors hover:border-rune-gold hover:text-rune-gold"
            >
              ↗ OPEN DIRECT
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      key={reloadKey}
      src={src}
      title="Odysseus Workspace"
      className="h-full w-full border-0"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
      allow="clipboard-read; clipboard-write; microphone"
    />
  );
}
