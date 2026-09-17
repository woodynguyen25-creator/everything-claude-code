/**
 * Tests for scripts/claudex/runner_local.py — the local launcher for claudex-loop.
 *
 * Run with: node tests/claudex/runner-local.test.js
 *
 * WHY THIS FILE EXISTS
 * claudex-loop's upstream runner, run as-is on this machine, would (1) fail to find Codex
 * (not on PATH since 2026-09-11), (2) give its "read-only" Codex reviewer Woody's real
 * ~/.codex — including the Robinhood trading MCP, which a shell sandbox does not restrict —
 * and (3) pay ~53k tokens of startup per round against the plan allowance the council shares.
 * These tests hold the launcher to the three fixes without spending any model quota: they use
 * --print-launch (decide, don't launch) and import the pure helpers.
 */
'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'claudex', 'runner_local.py');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); failed++; }
}

function python() {
  for (const cand of ['python', 'python3', 'py']) {
    const r = spawnSync(cand, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return cand;
  }
  return null;
}
const PY = python();

function launch(args, env = {}) {
  const r = spawnSync(PY, [SCRIPT, '--print-launch', ...args], {
    encoding: 'utf8', env: { ...process.env, ...env },
  });
  if (r.status !== 0) throw new Error(`print-launch failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function pyEval(code) {
  const r = spawnSync(PY, ['-c', `import sys; sys.path.insert(0, r"${path.dirname(SCRIPT)}"); import runner_local as m\n${code}`], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}

console.log('\n=== claudex runner_local: role -> provider ===\n');

if (!PY) {
  console.log('  (no python on this machine — skipped)');
} else {
  test('Claude host, plan review -> Codex reviewer', () => {
    assert.equal(launch(['review', '--host', 'claude', '--plan', 'P.md']).provider, 'codex');
  });
  test('Codex host, plan review -> Claude reviewer', () => {
    assert.equal(launch(['review', '--host', 'codex', '--plan', 'P.md']).provider, 'claude');
  });
  test('inspection is always the provider opposite the builder', () => {
    assert.equal(launch(['inspect', '--host', 'claude', '--builder', 'codex', '--base', 'x']).provider, 'claude');
    assert.equal(launch(['inspect', '--host', 'claude', '--base', 'x']).provider, 'codex');
  });
  test('build launches the chosen builder', () => {
    assert.equal(launch(['build', '--host', 'claude', '--builder', 'codex']).provider, 'codex');
  });
  test('roles/check launch nothing', () => {
    assert.equal(launch(['roles', '--host', 'claude']).provider, null);
    assert.equal(launch(['check', '--host', 'claude']).provider, null);
  });

  console.log('\n=== claudex runner_local: the three local fixes ===\n');

  test('a Codex call runs under the lean private home, never the real ~/.codex', () => {
    const l = launch(['review', '--host', 'claude', '--plan', 'P.md']);
    assert.ok(l.env.CODEX_HOME, 'CODEX_HOME must be set for a Codex call');
    assert.ok(!/[\\/]\.codex$/.test(l.env.CODEX_HOME), `must not be the real home: ${l.env.CODEX_HOME}`);
  });

  test('a Claude call does not touch CODEX_HOME or --cli', () => {
    const l = launch(['review', '--host', 'codex', '--plan', 'P.md']);
    assert.equal(l.env.CODEX_HOME, undefined);
    assert.ok(!l.args.includes('--cli'));
  });

  test('the native Codex binary is passed as --cli when the desktop app is installed', () => {
    const fake = fs.mkdtempSync(path.join(os.tmpdir(), 'claudex-la-'));
    const bin = path.join(fake, 'OpenAI', 'Codex', 'bin', 'abc123');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, 'codex.exe'), '');
    const l = launch(['review', '--host', 'claude', '--plan', 'P.md'], { LOCALAPPDATA: fake });
    const i = l.args.indexOf('--cli');
    assert.ok(i !== -1, 'expected --cli');
    assert.equal(l.args[i + 1], path.join(bin, 'codex.exe'));
  });

  test('an explicit --cli from the user is respected, never overridden', () => {
    const l = launch(['review', '--host', 'claude', '--plan', 'P.md', '--cli', 'C:\\x\\codex.exe']);
    assert.equal(l.args.filter(a => a === '--cli').length, 1);
  });

  test('run artifacts default to a folder outside any checkout', () => {
    const l = launch(['review', '--host', 'claude', '--plan', 'P.md']);
    const i = l.args.indexOf('--artifacts');
    assert.ok(i !== -1);
    assert.match(l.args[i + 1], /\.claudex-runs$/);
  });

  test('the lean config mirrors only model and effort — no MCP, plugins or hooks', () => {
    const cfg = pyEval('print(m.lean_config())');
    for (const key of ['mcp_servers', 'plugins', 'hooks', 'marketplaces', 'developer_instructions']) {
      assert.ok(!cfg.includes(key), `lean config must not contain ${key}`);
    }
    for (const line of cfg.split('\n').filter(Boolean)) {
      assert.match(line, /^(model|model_reasoning_effort) = "/, `unexpected line: ${line}`);
    }
  });

  console.log('\n=== claudex runner_local: naming the plan cap ===\n');

  test('the real Codex cap message is named with its reset time', () => {
    const out = pyEval(`print(m.failure_reason("model: gpt-6-astra\\nERROR: You've hit your usage limit. Upgrade to Pro (x), visit y or try again at 2:20 PM."))`);
    assert.equal(out, 'USAGE-LIMIT: ChatGPT plan cap reached — Codex back at 2:20 PM');
  });

  test('an ordinary failure is not mislabelled as a cap', () => {
    assert.equal(pyEval('print(m.failure_reason("claude exited 1: model not found"))'), 'None');
  });

  test('the final runner record is parsed out of mixed stdout', () => {
    const out = pyEval([
      'import json',
      'first = json.dumps({"provider": "codex", "artifacts": "x"})',
      'rec = json.dumps({"status": "failed", "mode": "review", "error": "boom"}, indent=2)',
      'print(m.last_record(first + "\\n" + rec + "\\n")["error"])',
    ].join('\n'));
    assert.equal(out, 'boom');
  });

  test('a ledger row is tagged claudex so council budget reports can see it', () => {
    const out = pyEval([
      'import json',
      'row = m.ledger_row({"status":"completed","mode":"review","response":{"verdict":"REVISE"},"usage":{"input_tokens":10,"output_tokens":5}}, "codex", 1234, None)',
      'print(json.dumps(row))',
    ].join('\n'));
    const row = JSON.parse(out);
    assert.equal(row.kind, 'claudex');
    assert.equal(row.tag, 'claudex-review');
    assert.equal(row.verdict, 'REVISE');
    assert.equal(row.ok, true);
    assert.equal(row.promptTokens, 10);
  });

  test('Claude input tokens include cache reads — the first live run logged 6 for an ~18.9k read', () => {
    // Real usage block from the 2026-09-17 smoke test.
    const out = pyEval([
      'import json',
      'rec = {"status":"completed","mode":"review","observed_models":["claude-haiku-4-5-20251001","claude-opus-5[1m]"],',
      '       "usage":{"input_tokens":6,"cache_creation_input_tokens":6973,"cache_read_input_tokens":11950,"output_tokens":2786},',
      '       "total_cost_usd":0.146746}',
      'print(json.dumps(m.ledger_row(rec, "claude", 30221, None)))',
    ].join('\n'));
    const row = JSON.parse(out);
    assert.equal(row.promptTokens, 18929);
    assert.equal(row.model, 'claude-opus-5[1m]', 'the working model, not the internal haiku helper');
  });

  test('API-equivalent cost is recorded apart from `usd`, so subscription calls never inflate the council budget', () => {
    const out = pyEval([
      'import json',
      'print(json.dumps(m.ledger_row({"status":"completed","mode":"review","total_cost_usd":0.15}, "claude", 1, None)))',
    ].join('\n'));
    const row = JSON.parse(out);
    assert.equal(row.apiEquivUsd, 0.15);
    assert.equal(row.usd, undefined, 'budget.js sums `usd` as real spend');
  });
}

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
