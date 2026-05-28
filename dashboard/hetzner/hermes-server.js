// Hermes server — cron daemon + HTTP API
// Runs on Hetzner. Reads hermes-jobs.json, executes on schedule, writes status.
// Exposes:
//   GET  /status                — full status JSON (no auth — Tailscale-only)
//   POST /trigger/:jobId        — manually fire a job (requires HERMES_TOKEN)
//   GET  /health                — basic healthcheck

'use strict';

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const express = require('express');
const cron = require('node-cron');

// Constant-time token comparison (prevents timing attacks)
function safeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const ROOT = __dirname;
const JOBS_PATH = path.join(ROOT, 'hermes-jobs.json');
const STATUS_PATH = path.join(ROOT, 'hermes-status.json');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const PORT = parseInt(process.env.HERMES_PORT || '3001', 10);
const TOKEN = process.env.HERMES_TOKEN;
const DAEMON_STARTED_AT = new Date().toISOString();

// In-memory state
const state = {
  daemonStartedAt: DAEMON_STARTED_AT,
  daemonRunning: true,
  jobs: [],
  checkedAt: null,
};

function loadJobs() {
  const raw = JSON.parse(fs.readFileSync(JOBS_PATH, 'utf-8'));
  state.jobs = raw.jobs.map((j) => ({
    ...j,
    nextRun: getNextRun(j.schedule),
    lastAttempt: null,
    lastSuccess: null,
    lastResult: null,
    lastError: null,
    durationMs: null,
  }));
}

function getNextRun(schedule) {
  if (!schedule || !schedule.cron) return '—';
  // node-cron doesn't expose nextRun; show the cron expression instead
  return schedule.cron;
}

function persistStatus() {
  state.checkedAt = new Date().toISOString();
  fs.writeFileSync(STATUS_PATH, JSON.stringify(state, null, 2));
}

function runJob(job) {
  if (!job.enabled) return;
  const scriptPath = path.join(SCRIPTS_DIR, job.script);
  if (!fs.existsSync(scriptPath)) {
    job.lastResult = 'failed';
    job.lastError = `script not found: ${job.script}`;
    job.lastAttempt = new Date().toISOString();
    persistStatus();
    return;
  }
  const start = Date.now();
  job.lastAttempt = new Date().toISOString();
  console.log(`[hermes] firing ${job.id} → ${job.script}`);

  const child = spawn('node', [scriptPath], { cwd: ROOT, env: { ...process.env } });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d.toString(); });
  child.on('close', (code) => {
    job.durationMs = Date.now() - start;
    if (code === 0) {
      job.lastResult = 'success';
      job.lastSuccess = new Date().toISOString();
      job.lastError = null;
      console.log(`[hermes] ✓ ${job.id} (${(job.durationMs / 1000).toFixed(1)}s)`);
    } else {
      job.lastResult = 'failed';
      job.lastError = stderr.slice(0, 500) || `exit code ${code}`;
      console.error(`[hermes] ✗ ${job.id} failed: ${job.lastError}`);
    }
    persistStatus();
  });
}

function scheduleAll() {
  state.jobs.forEach((job) => {
    if (!job.enabled || !job.schedule?.cron) return;
    cron.schedule(job.schedule.cron, () => runJob(job), {
      timezone: job.schedule.tz || 'America/Chicago',
    });
    console.log(`[hermes] scheduled ${job.id} → ${job.schedule.cron} (${job.schedule.tz})`);
  });
}

// HTTP API
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.get('/status', (_req, res) => {
  persistStatus();
  res.json(state);
});

app.post('/trigger/:jobId', (req, res) => {
  const auth = req.headers.authorization || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!safeTokenEqual(provided, TOKEN)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const job = state.jobs.find((j) => j.id === req.params.jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  runJob(job);
  res.json({ triggered: job.id });
});

// Boot
loadJobs();
scheduleAll();
persistStatus();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[hermes] daemon listening on :${PORT}`);
  console.log(`[hermes] ${state.jobs.length} jobs loaded, ${state.jobs.filter((j) => j.enabled).length} armed`);
});

// Graceful shutdown
process.on('SIGTERM', () => { state.daemonRunning = false; persistStatus(); process.exit(0); });
process.on('SIGINT', () => { state.daemonRunning = false; persistStatus(); process.exit(0); });
