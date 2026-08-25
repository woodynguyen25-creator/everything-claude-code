/**
 * Tests for the CODEX tool shapes in ~/.claude/scripts/hooks/verify-evidence-track.js.
 *
 * Run with: node tests/hooks/verify-evidence-codex.test.js
 *
 * WHY THIS FILE EXISTS
 * 2026-08-25: the verify-evidence hook PAIR (PostToolUse tracker + Stop checker) was
 * ported into ~/.codex/hooks.json so CLAUDE.md §3 — "no 'fixed'/'shipped' without an
 * artifact" — would have teeth on the Codex side too. The first probe recorded
 * NOTHING: the tracker matched `^(Write|Edit|NotebookEdit)$` and `^(Bash|PowerShell)$`,
 * and Codex names its tools `apply_patch` and `shell`. The hook was installed,
 * running, exiting 0, and enforcing nothing.
 *
 * A hook that silently matches no tool is decorative — the exact failure class the
 * 2026-08-06 CLAUDE.md rewrite exists to prevent, reintroduced by the port meant to
 * enforce it. These tests hold both runtimes' tool vocabularies at once.
 *
 * The hook lives in the USER hooks directory, not this repo, so it is absent in CI
 * and on other machines. Absence must NOT fail — a green run here means "nothing
 * broken was found", not "the hook was verified".
 */
'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOKS = path.join(process.env.USERPROFILE || os.homedir(), '.claude', 'scripts', 'hooks');
const TRACK = path.join(HOOKS, 'verify-evidence-track.js');
const CHECK = path.join(HOOKS, 'verify-evidence-check.js');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}`); console.log(`    ${err.message}`); failed++; }
}

const installed = fs.existsSync(TRACK) && fs.existsSync(CHECK);

console.log('\n=== verify-evidence: Codex tool vocabulary ===\n');

if (!installed) {
  console.log('  (verify-evidence hooks not installed on this machine — nothing to check)');
} else {
  // Each case runs the pair in its OWN cwd: the state file is keyed by
  // CLAUDE_SESSION_ID or, failing that, a hash of cwd — the latter being what
  // happens under Codex, and what keeps Codex state separate from Claude's.
  // The checker writes its warning to stderr and still exits 0, so stderr is
  // captured explicitly rather than inferred from an exit code.
  let seq = 0;
  function runSession(events) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `verify-ev-${seq++}-`));
    const env = { ...process.env };
    delete env.CLAUDE_SESSION_ID; // force the cwd-hash path, i.e. the Codex path
    for (const e of events) {
      execFileSync(process.execPath, [TRACK], { input: JSON.stringify(e), cwd: dir, env });
    }
    const out = spawnSync(process.execPath, [CHECK], { input: '{}', cwd: dir, env, encoding: 'utf8' });
    return String(out.stderr || '');
  }

  const edit = p => ({ toolName: 'apply_patch', toolInput: { path: p } });

  test('Codex apply_patch on a code file is recorded — the case that recorded NOTHING before', () => {
    assert.match(runSession([edit('C:/x/thing.js')]), /1 code file\(s\) changed/);
  });

  test('apply_patch carrying only a patch BODY still yields the file path', () => {
    const warn = runSession([{ toolName: 'apply_patch', toolInput: { patch: '*** Update File: src/server.js\n@@\n-a\n+b\n' } }]);
    assert.match(warn, /src\/server\.js/);
  });

  test('a unified diff inside the patch body is understood too', () => {
    const warn = runSession([{ toolName: 'apply_patch', toolInput: { patch: '--- a/lib/x.py\n+++ b/lib/x.py\n@@\n-1\n+2\n' } }]);
    assert.match(warn, /lib\/x\.py/);
  });

  test('Codex shell passing argv as an ARRAY counts as evidence', () => {
    // input.command is a string under Claude and an array under Codex; joining is
    // the difference between "evidence ran" and a false warning on every session.
    const warn = runSession([
      edit('C:/x/thing.js'),
      { toolName: 'shell', toolInput: { command: ['node', '--check', 'thing.js'] } },
    ]);
    assert.equal(warn.trim(), '', `expected silence, got: ${warn}`);
  });

  test('evidence BEFORE the last edit does not excuse it (temporal ordering survives)', () => {
    const warn = runSession([
      { toolName: 'shell', toolInput: { command: ['npm', 'test'] } },
      edit('C:/x/late.js'),
    ]);
    assert.match(warn, /late\.js/);
  });

  test('editing a doc is not "code that needs proving"', () => {
    assert.equal(runSession([edit('C:/x/NOTES.md')]).trim(), '');
  });

  test('NO REGRESSION: Claude\'s own tool names still record', () => {
    assert.match(
      runSession([{ tool_name: 'Edit', tool_input: { file_path: 'C:/x/legacy.js' } }]),
      /legacy\.js/,
    );
  });

  test('NO REGRESSION: Claude Bash string commands still count as evidence', () => {
    const warn = runSession([
      { tool_name: 'Write', tool_input: { file_path: 'C:/x/a.js' } },
      { tool_name: 'Bash', tool_input: { command: 'node --check a.js' } },
    ]);
    assert.equal(warn.trim(), '', `expected silence, got: ${warn}`);
  });

  test('an unparseable payload never throws — the hook must never break the tool path', () => {
    const r = spawnSync(process.execPath, [TRACK], { input: 'not json', encoding: 'utf8' });
    assert.equal(r.status, 0);
  });
}

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);
