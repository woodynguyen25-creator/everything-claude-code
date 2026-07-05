#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function fail(message) {
  console.error(`[codex-compat] ${message}`);
  process.exit(1);
}

function sortVersionsDescending(left, right) {
  return right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' });
}

function findClaudeMemRoot() {
  const envRoot = process.env.CLAUDE_MEM_PLUGIN_ROOT;
  if (envRoot && fs.existsSync(envRoot)) {
    return envRoot;
  }

  const cacheRoot = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'thedotmack', 'claude-mem');
  if (!fs.existsSync(cacheRoot)) {
    return null;
  }

  const versions = fs.readdirSync(cacheRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort(sortVersionsDescending);

  for (const version of versions) {
    const candidate = path.join(cacheRoot, version);
    const runtimeRoot = path.join(candidate, 'plugin');
    if (fs.existsSync(path.join(candidate, 'scripts'))) {
      return candidate;
    }
    if (fs.existsSync(path.join(runtimeRoot, 'scripts'))) {
      return runtimeRoot;
    }
  }

  return null;
}

function resolveScriptPaths() {
  const root = findClaudeMemRoot();
  if (!root) {
    fail('Unable to locate claude-mem plugin runtime under ~/.claude/plugins/cache/thedotmack/claude-mem');
  }

  const scriptsDir = path.join(root, 'scripts');
  const bunRunner = path.join(scriptsDir, 'bun-runner.js');
  const workerService = path.join(scriptsDir, 'worker-service.cjs');
  const versionCheck = path.join(scriptsDir, 'version-check.js');
  const mcpServer = path.join(scriptsDir, 'mcp-server.cjs');

  for (const requiredFile of [bunRunner, workerService, versionCheck, mcpServer]) {
    if (!fs.existsSync(requiredFile)) {
      fail(`claude-mem bridge is missing runtime file: ${requiredFile}`);
    }
  }

  return { root, bunRunner, workerService, versionCheck, mcpServer };
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: process.env
  });

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  if (result.error) {
    fail(result.error.message);
  }

  process.exit(0);
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  const paths = resolveScriptPaths();

  switch (command) {
    case 'mcp':
      runNode([paths.mcpServer]);
      break;
    case 'version-check':
      runNode([paths.versionCheck]);
      break;
    case 'worker-start':
      runNode([paths.bunRunner, paths.workerService, 'start']);
      break;
    case 'hook': {
      const [phase] = args;
      if (!phase) {
        fail('Missing hook phase for claude-mem bridge');
      }
      runNode([paths.bunRunner, paths.workerService, 'hook', 'codex', phase]);
      break;
    }
    case 'status':
      console.log(JSON.stringify({
        root: paths.root,
        workerPortSettingsPath: path.join(os.homedir(), '.claude-mem', 'settings.json'),
        dataDir: path.join(os.homedir(), '.claude-mem')
      }, null, 2));
      break;
    default:
      fail(`Unknown claude-mem bridge command: ${command || '<none>'}`);
  }
}

main();
