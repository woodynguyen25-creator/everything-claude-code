// Single source of truth for the Odysseus workspace URL.
// Odysseus is the self-hosted AI workspace on the Droplet, reachable over the
// tailnet. Currently HTTP (auth-off, tailnet-private + public port firewalled).
// Once `sudo tailscale set --operator=hermes` is run on the Droplet, flip this
// to the HTTPS Serve URL (https://woody-hermes.tail13499d.ts.net) for a valid
// cert + installable mobile PWA. Override anytime with NEXT_PUBLIC_ODYSSEUS_URL.
export const ODYSSEUS_URL =
  process.env.NEXT_PUBLIC_ODYSSEUS_URL ?? 'http://100.78.199.123:7000';

// Display-only label for the host Odysseus shares with Hermes on the Droplet.
export const ODYSSEUS_HOST = 'woody-hermes · Droplet';
