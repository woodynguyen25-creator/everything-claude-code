#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');

function run(label, command, args, cwd = repoRoot) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, {
    cwd,
    shell: true,
    encoding: 'utf8',
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status}`);
  }
}

run('AIOS digest render', 'node', [`"${process.env.USERPROFILE}\\.claude\\scripts\\aios-dashboard\\render.js"`]);
run('Codex usage poll', 'node', ['scripts/tools/poll-codex-usage.js'], path.join(repoRoot, 'dashboard'));

console.log('\nMetrics refreshed.');
