// Single source of truth for the Odysseus workspace URLs.
// Odysseus is the self-hosted AI workspace on the Droplet, reachable over the
// tailnet two ways:
//  - HTTP  (direct ip:port) — fine when the dashboard itself is on http://
//    (desktop localhost), and always fine as a TOP-LEVEL link from anywhere.
//  - HTTPS (Tailscale Serve) — required for the iframe when the dashboard is
//    served over https:// (phone via woodys-pc.ts.net): browsers block plain
//    http subresources inside https pages (mixed content), including iframes
//    AND the reachability probe fetch.
// Enable on the Droplet with: sudo tailscale serve --bg 7000
export const ODYSSEUS_HTTP_URL =
  process.env.NEXT_PUBLIC_ODYSSEUS_URL ?? 'http://100.78.199.123:7000';

export const ODYSSEUS_HTTPS_URL =
  process.env.NEXT_PUBLIC_ODYSSEUS_HTTPS_URL ?? 'https://woody-hermes.tail13499d.ts.net';

// Back-compat alias for existing imports (header links, gateway tiles).
// Top-level navigation to http from an https page is allowed by browsers,
// so this stays correct for <a href> uses everywhere.
export const ODYSSEUS_URL = ODYSSEUS_HTTP_URL;

/**
 * Pick the embed-safe URL for the current page protocol. Client-side only —
 * call from a 'use client' component. On https pages the iframe MUST use the
 * Tailscale Serve HTTPS URL or the browser silently blocks it.
 */
export function resolveOdysseusEmbedUrl(): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return ODYSSEUS_HTTPS_URL;
  }
  return ODYSSEUS_HTTP_URL;
}

// Display-only label for the host Odysseus shares with Hermes on the Droplet.
export const ODYSSEUS_HOST = 'woody-hermes · Droplet';
