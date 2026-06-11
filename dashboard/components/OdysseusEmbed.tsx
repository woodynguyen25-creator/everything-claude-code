'use client';

import { useEffect, useState } from 'react';
import { ODYSSEUS_HTTP_URL, resolveOdysseusEmbedUrl } from '@/lib/odysseus';

// Embeds the Odysseus workspace full-bleed, picking the protocol-correct URL:
// http (direct droplet) on http:// pages, Tailscale Serve HTTPS on https://
// pages — browsers block plain-http iframes AND probe fetches inside https
// pages (mixed content), which used to make mobile show "unreachable" while
// the droplet was fine. Falls back to a gateway card with a working top-level
// direct link (top-level http navigation is always allowed).
export default function OdysseusEmbed() {
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'unreachable'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [needsServe, setNeedsServe] = useState(false);

  // Resolve client-side so we read the real page protocol after hydration.
  useEffect(() => {
    setSrc(resolveOdysseusEmbedUrl());
  }, []);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const probe = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        await fetch(src, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timer);
        if (!cancelled) setStatus('ok');
      } catch {
        if (!cancelled) {
          setStatus('unreachable');
          // On https pages a failed probe to the Serve URL usually means
          // `tailscale serve` isn't enabled on the droplet yet.
          setNeedsServe(typeof window !== 'undefined' && window.location.protocol === 'https:');
        }
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
          <div className="text-rune text-[10px] tracking-[0.3em] text-rune-gold">WORKSPACE GATEWAY</div>
          <h2 className="mt-2 font-display text-lg text-text-primary">
            {needsServe ? 'Odysseus needs its HTTPS gate' : 'Odysseus is unreachable'}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {needsServe ? (
              <>
                The embed needs Tailscale Serve on the Droplet. Run once:{' '}
                <code className="rounded bg-bg-deep px-1.5 py-0.5 font-mono text-[11px] text-rune-gold">
                  sudo tailscale serve --bg 7000
                </code>{' '}
                — or open the workspace directly below (works now).
              </>
            ) : (
              <>Check that Tailscale is connected and the Droplet is awake.</>
            )}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStatus('loading');
                setNeedsServe(false);
                setReloadKey((k) => k + 1);
              }}
              className="min-h-[44px] cursor-pointer rounded border border-border-subtle px-4 py-2 font-mono text-[10px] tracking-wider text-text-secondary transition-colors hover:border-rune-gold hover:text-rune-gold"
            >
              ↻ RETRY
            </button>
            <a
              href={ODYSSEUS_HTTP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] cursor-pointer items-center rounded border border-bifrost/40 bg-bifrost/10 px-4 py-2 font-mono text-[10px] tracking-wider text-bifrost transition-colors hover:border-bifrost"
            >
              ↗ OPEN ODYSSEUS DIRECT
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!src || status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-[11px] tracking-wider text-text-muted">
          Opening the gateway…
        </span>
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
