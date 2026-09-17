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

  // 2026-09-17, found reviewing the commit: the first cut read options by scanning for an
  // exact `--host` token. argparse also accepts `--host=claude` and any unambiguous prefix
  // (`--ho claude`). Those forms launched the SAME delegate while this launcher saw no
  // provider at all — so no lean CODEX_HOME was set and the Codex reviewer would have
  // inherited the real ~/.codex and its Robinhood trading MCP. It failed safe only by
  // accident (no --cli either, and `codex` is off PATH today); restore PATH and it is live.
  console.log('\n=== argparse-faithful parsing: the lean home cannot be argued away ===\n');

  for (const form of [
    ['review', '--host=claude'],
    ['review', '--ho', 'claude'],
    ['build', '--host', 'codex', '--builder=codex'],
    ['inspect', '--host', 'codex', '--builder=claude'],
  ]) {
    test(`${form.join(' ')} -> codex delegate gets the lean home`, () => {
      const l = launch(form);
      assert.equal(l.provider, 'codex', 'provider must be detected in every argparse form');
      assert.equal(l.env.CODEX_HOME, path.join(os.homedir(), '.codex-claudex'));
      assert.ok(l.args.includes('--cli'), 'native exe must be passed');
    });
  }

  test('--provider=codex (explicit override, equals form) still gets the lean home', () => {
    const l = launch(['review', '--host', 'codex', '--provider=codex']);
    assert.equal(l.provider, 'codex');
    assert.equal(l.env.CODEX_HOME, path.join(os.homedir(), '.codex-claudex'));
  });

  test('an unparseable work invocation is REFUSED, not launched blind', () => {
    const r = spawnSync(PY, [SCRIPT, '--print-launch', 'review', '--host', 'banana'], { encoding: 'utf8' });
    assert.notEqual(r.status, 0, 'must exit non-zero rather than launch with an unknown delegate');
    assert.match(`${r.stderr}${r.stdout}`, /refus/i);
  });

  test('roles/check need no delegate and stay allowed', () => {
    assert.equal(launch(['roles', '--host', 'claude']).provider, null);
  });

  /**
   * Everything above decides; this one executes. Flagged in review 2026-09-17: every other test
   * used --print-launch, so `env = {**os.environ, **launch["env"]}` could have been deleted
   * outright and the suite would have stayed green while the real Codex subprocess inherited
   * the real ~/.codex. This runs main() against a stub runner and reads the env that arrived.
   */
  test('the SUBPROCESS actually receives the lean CODEX_HOME (not just the plan)', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'claudex-run-'));
    fs.mkdirSync(path.join(home, '.codex'));
    fs.writeFileSync(path.join(home, '.codex', 'auth.json'), '{"tok":"x"}');
    const stub = path.join(home, 'stub_runner.py');
    fs.writeFileSync(stub, [
      'import os, json',
      "print('SAW_CODEX_HOME=' + os.environ.get('CODEX_HOME', 'MISSING'))",
      "print()",
      "print(json.dumps({'status':'completed','mode':'review','usage':{'input_tokens':5},"
        + "'total_cost_usd':0.01,'response':{'verdict':'APPROVED'}}, indent=2))",
    ].join('\n'));

    const driver = [
      `import sys; sys.path.insert(0, r"${path.dirname(SCRIPT)}")`,
      'from pathlib import Path',
      'import runner_local as m',
      `m.find_runner = lambda: Path(r"${stub}")`,
      `m.LEDGER = Path(r"${path.join(home, 'ledger.jsonl')}")`,
      'rc = m.main(["review", "--host", "claude", "--plan", "P.md"])',
      'print("EXIT", rc)',
      'print("LEDGER", m.LEDGER.read_text(encoding="utf-8").strip())',
    ].join('\n');
    const r = spawnSync(PY, ['-c', driver], {
      encoding: 'utf8',
      env: { ...process.env, USERPROFILE: home, HOME: home, LOCALAPPDATA: home },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`SAW_CODEX_HOME=${path.join(home, '.codex-claudex').replace(/\\/g, '\\\\')}`),
      `the delegate must run under the lean home. stdout:\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /SAW_CODEX_HOME=MISSING/);
    const row = JSON.parse(r.stdout.split('LEDGER ')[1]);
    assert.equal(row.kind, 'claudex');
    assert.equal(row.verdict, 'APPROVED');
  });

  /**
   * Both reviewers called the FORBIDDEN_KEYS scan decorative: lean_config() interpolates the
   * real config's model/effort into TOML unescaped, and the scan only catches five table names.
   * A value carrying a newline can therefore add any OTHER key — `notify` is a hook, i.e. code
   * execution — and the lean home stops being lean. The value is only as trusted as whatever
   * last wrote ~/.codex/config.toml, so validate it instead of enumerating what's forbidden.
   */
  test('a config value that injects ANY extra TOML key is refused', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'claudex-inject-'));
    fs.mkdirSync(path.join(home, '.codex'));
    fs.writeFileSync(path.join(home, '.codex', 'auth.json'), '{"tok":"x"}');
    // A model value carrying a newline, built without escapes so the shell cannot mangle it.
    const poisoned = `('gpt-6-astra"' + chr(10) + 'notify = ["cmd", "/c", "calc"]' + chr(10) + 'x = "')`;
    const driver = [
      `import sys; sys.path.insert(0, r"${path.dirname(SCRIPT)}")`,
      'import runner_local as m',
      `m.interactive_model = lambda: (${poisoned}, "high")`,
      'try:',
      '    m.prepare_lean_home(); print("WROTE")',
      'except SystemExit as e: print("REFUSED:", e)',
      'p = m.LEAN_HOME / "config.toml"',
      'print("CONFIG:", repr(p.read_text(encoding="utf-8")) if p.is_file() else "none")',
    ].join('\n');
    const r = spawnSync(PY, ['-c', driver], {
      encoding: 'utf8', env: { ...process.env, USERPROFILE: home, HOME: home },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /REFUSED/, `poisoned value was accepted. stdout:\n${r.stdout}`);
    const written = r.stdout.split('CONFIG:')[1] || '';
    assert.doesNotMatch(written, /notify/, `poisoned TOML reached config.toml:${written}`);
  });

  test('a lean home aimed at the REAL ~/.codex is refused, not written over', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claudex-guard-'));
    const codex = path.join(tmp, '.codex');
    fs.mkdirSync(codex);
    fs.writeFileSync(path.join(codex, 'auth.json'), '{"tok":"x"}');
    const original = 'model = "gpt-6-astra"\n[mcp_servers.robinhood]\ncommand = "rh"\n';
    fs.writeFileSync(path.join(codex, 'config.toml'), original);
    const r = spawnSync(PY, ['-c', [
      `import sys; sys.path.insert(0, r"${path.dirname(SCRIPT)}"); import runner_local as m`,
      'm.prepare_lean_home()',
    ].join('\n')], { encoding: 'utf8', env: { ...process.env, USERPROFILE: tmp, CLAUDEX_CODEX_HOME: codex } });
    assert.notEqual(r.status, 0, 'must refuse');
    assert.match(r.stderr, /refus/i, 'and say why, not raise SameFileError');
    assert.equal(fs.readFileSync(path.join(codex, 'config.toml'), 'utf8'), original,
      'the real config.toml — doctrine and MCP list — must be untouched');
  });
}

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
