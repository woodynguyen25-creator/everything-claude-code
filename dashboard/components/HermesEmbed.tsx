'use client';

import { useEffect, useState } from 'react';

interface HermesEmbedProps {
  src: string;
}

// Embeds the Hermes Agent web UI from the Droplet via Tailscale.
// Falls back to a connect prompt if the iframe doesn't load within 4s
// (e.g. Tailscale offline, Droplet sleeping).
export default function HermesEmbed({ src }: HermesEmbedProps) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'unreachable'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(src, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timer);
        if (!cancelled) setStatus(res ? 'ok' : 'unreachable');
      } catch {
        if (!cancelled) setStatus('unreachable');
      }
    };
    probe();
    return () => { cancelled = true; };
  }, [src, reloadKey]);

  if (status === 'unreachable') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] px-6 py-5 text-center max-w-md">
          <div className="text-rune text-[10px] tracking-[0.3em] text-rose-400">CONNECTION LOST</div>
          <h2 className="mt-2 font-display text-lg text-text-primary">Hermes Web UI unreachable</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Check that Tailscale is connected on this machine and the Droplet is awake.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => { setStatus('loading'); setReloadKey((k) => k + 1); }}
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
      title="Hermes Agent Dashboard"
      className="h-full w-full border-0"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
      allow="clipboard-read; clipboard-write"
    />
  );
}
