#!/usr/bin/env node
'use strict';
// Tailscale proxy: exposes the PC dashboard on the PC's Tailscale IP so the Droplet's Hermes Agent
// can reach it.
//
// Why this exists:
//   The Norse dashboard binds to 127.0.0.1:3737 ONLY (binding to :: or 0.0.0.0 freezes the VS Code
//   webview pane on Windows — confirmed across 3+ incidents). This proxy listens on the PC's
//   Tailscale IP and forwards every request to localhost:3737. Tailscale traffic is encrypted by
//   WireGuard end-to-end.
//
// Usage:
//   node scripts/tailscale-proxy.js
//   → starts proxy on 100.69.115.98:3738 (Woody's PC Tailscale IP)
//
// Or via Windows Task Scheduler — see scripts/install-tailscale-proxy.ps1.

const http = require('node:http');
const { execSync } = require('node:child_process');

const TARGET_HOST = process.env.PROXY_TARGET_HOST || '127.0.0.1';
const TARGET_PORT = parseInt(process.env.PROXY_TARGET_PORT || '3737', 10);
const LISTEN_PORT = parseInt(process.env.PROXY_LISTEN_PORT || '3738', 10);

function getTailscaleIp() {
  // Allow override via env (e.g. CI/tests)
  if (process.env.PROXY_LISTEN_HOST) return process.env.PROXY_LISTEN_HOST;
  try {
    const out = execSync('tailscale ip -4', { encoding: 'utf-8', timeout: 5000 });
    const ip = out.split('\n').find((line) => line.trim().startsWith('100.'));
    if (!ip) throw new Error('No Tailscale IPv4 found');
    return ip.trim();
  } catch (err) {
    console.error('[tailscale-proxy] Failed to resolve Tailscale IP:', err.message);
    console.error('[tailscale-proxy] Set PROXY_LISTEN_HOST manually or ensure Tailscale is connected.');
    process.exit(1);
  }
}

const listenHost = getTailscaleIp();

const server = http.createServer((clientReq, clientRes) => {
  const proxyReq = http.request(
    {
      host: TARGET_HOST,
      port: TARGET_PORT,
      path: clientReq.url,
      method: clientReq.method,
      headers: { ...clientReq.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(clientRes, { end: true });
    }
  );
  proxyReq.on('error', (err) => {
    console.error('[tailscale-proxy] upstream error:', err.message);
    if (!clientRes.headersSent) clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    clientRes.end('Bad gateway: dashboard not reachable');
  });
  clientReq.pipe(proxyReq, { end: true });
});

server.listen(LISTEN_PORT, listenHost, () => {
  console.log(`[tailscale-proxy] Listening on http://${listenHost}:${LISTEN_PORT}`);
  console.log(`[tailscale-proxy] Forwarding to http://${TARGET_HOST}:${TARGET_PORT}`);
});

server.on('error', (err) => {
  console.error('[tailscale-proxy] Listen error:', err.message);
  process.exit(1);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[tailscale-proxy] ${signal} received, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
