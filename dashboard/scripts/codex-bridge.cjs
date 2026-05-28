#!/usr/bin/env node
/**
 * Codex Bridge — exposes Codex CLI as an HTTP endpoint reachable from the Droplet
 * via Tailscale. Hermes calls this when:
 *   1. User explicitly invokes `/codex <task>`
 *   2. Auto-routing detects "deep" intent (keywords: deep, analyze, refactor, architect, debug)
 *
 * POST http://100.69.115.98:3739/codex
 *   { "prompt": "...", "mode": "ask|exec" }
 *
 * Returns { "output": "...", "elapsed_ms": ..., "exit_code": ... }
 *
 * Runs on PC because Codex CLI is logged in to your ChatGPT account locally.
 * Routed via Tailscale so the Droplet can reach it.
 */
'use strict';

const http = require('http');
const { spawn } = require('child_process');

const PORT = 3739;
const HOST = '100.69.115.98'; // Tailscale IP — only your tailnet can reach this
// On Windows the npm-installed `codex` is `codex.cmd`. Spawn needs shell:true
// or full path with extension. We default to the cmd shim when not overridden.
const path = require('path');
const DEFAULT_CODEX = process.platform === 'win32'
  ? path.join(process.env.APPDATA || '', 'npm', 'codex.cmd')
  : 'codex';
const CODEX_BIN = process.env.CODEX_BIN || DEFAULT_CODEX;
const MAX_PROMPT = 8000;
const MAX_TIMEOUT_MS = 120_000;

function readJSON(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 200_000) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function runCodex(prompt, mode) {
  return new Promise((resolve) => {
    // Pipe prompt via stdin (codex reads stdin when no positional arg).
    // shell:true on Windows to resolve codex.cmd.
    const args = mode === 'exec' ? ['exec', '--full-auto'] : ['exec'];
    const started = Date.now();
    const proc = spawn(CODEX_BIN, args, {
      windowsHide: true,
      shell: process.platform === 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    const killer = setTimeout(() => {
      proc.kill();
      resolve({ output: out + '\n[TIMEOUT after ' + MAX_TIMEOUT_MS + 'ms]', elapsed_ms: Date.now() - started, exit_code: -1, error: err });
    }, MAX_TIMEOUT_MS);
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => {
      clearTimeout(killer);
      // Codex output includes its own banner + "user" + prompt + "codex" + answer.
      // Extract the actual model response from after the last 'codex' header line.
      const lines = out.split(/\r?\n/);
      const codexIdx = (() => {
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim() === 'codex') return i;
        }
        return -1;
      })();
      let answer = out.trim();
      if (codexIdx !== -1) {
        // Take lines after 'codex' header, stop at 'tokens used' or end
        const tail = lines.slice(codexIdx + 1);
        const stopIdx = tail.findIndex((l) => l.trim().startsWith('tokens used'));
        answer = (stopIdx === -1 ? tail : tail.slice(0, stopIdx)).join('\n').trim();
      }
      resolve({ output: answer, raw_output: out.trim(), elapsed_ms: Date.now() - started, exit_code: code, error: err.trim() });
    });
    proc.on('error', (e) => {
      clearTimeout(killer);
      resolve({ output: '', elapsed_ms: Date.now() - started, exit_code: -1, error: String(e) });
    });
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, codex_bin: CODEX_BIN }));
    return;
  }
  if (req.method !== 'POST' || req.url !== '/codex') {
    res.writeHead(404).end('Not Found');
    return;
  }
  let body;
  try { body = await readJSON(req); } catch { res.writeHead(400).end('Bad JSON'); return; }
  const prompt = String(body.prompt || '').slice(0, MAX_PROMPT);
  if (!prompt) { res.writeHead(400).end('Missing prompt'); return; }
  const mode = body.mode === 'exec' ? 'exec' : 'ask';
  console.log(`[codex-bridge] ${new Date().toISOString()} ${mode} (${prompt.length} chars)`);
  const result = await runCodex(prompt, mode);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
  console.log(`[codex-bridge] done in ${result.elapsed_ms}ms (exit ${result.exit_code})`);
});

server.listen(PORT, HOST, () => {
  console.log(`[codex-bridge] listening on http://${HOST}:${PORT}`);
  console.log(`[codex-bridge] codex binary: ${CODEX_BIN}`);
});
