#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

let TOML;
try {
  TOML = require('@iarna/toml');
} catch {
  console.error('[codex-validate] Missing dependency: @iarna/toml');
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..', '..');
const home = os.homedir();
const codexRoot = path.join(home, '.codex');
const codexConfigPath = path.join(codexRoot, 'config.toml');
const codexHooksPath = path.join(codexRoot, 'hooks.json');
const generatedDir = path.join(repoRoot, 'codex-compat', 'generated');

const requiredMcpServers = ['claude_mem', 'tradingview', 'obsidian'];
const requiredHookCommands = [
  'worker-start',
  'hook context',
  'hook file-context',
  'hook observation',
  'hook session-init',
  'hook summarize'
];

const requiredSkills = [
  'watch',
  'claude-mem-search',
  'claude-mem-learn-codebase',
  'dashboard-builder',
  'frontend-design',
  'trading-infrastructure',
  'trading-quant-analyst',
  'lucky-dog-design-system',
  'documentation-lookup',
  'exa-search',
  'verification-loop',
  'backend-patterns',
  'coding-standards',
  'code-tour',
  'repo-scan',
  'product-capability',
  'eval-harness',
  'canary-watch',
  'research-ops',
  'market-research',
  'terminal-ops',
  'claude-skill',
  'deep-research'
];

const requiredPrompts = [
  'github-pr-reviewer.md',
  'github-issue-fixer.md',
  'ui-engineer.md',
  'prompt-creator.md'
];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    cwd: repoRoot,
    timeout: options.timeout || 20000,
    shell: false
  });
}

function pushResult(results, name, ok, details) {
  results.push({ name, ok, details });
}

function checkFileExists(results, name, filePath) {
  const ok = fs.existsSync(filePath);
  pushResult(results, name, ok, ok ? filePath : `missing: ${filePath}`);
}

function main() {
  const results = [];

  checkFileExists(results, 'codex-config', codexConfigPath);
  checkFileExists(results, 'codex-hooks', codexHooksPath);

  let parsedConfig = null;
  if (fs.existsSync(codexConfigPath)) {
    try {
      parsedConfig = TOML.parse(fs.readFileSync(codexConfigPath, 'utf8'));
      pushResult(results, 'config-parse', true, 'config.toml parsed');
    } catch (error) {
      pushResult(results, 'config-parse', false, error.message);
    }
  }

  if (parsedConfig) {
    const mcpServers = parsedConfig.mcp_servers || {};
    for (const server of requiredMcpServers) {
      pushResult(
        results,
        `mcp:${server}`,
        Boolean(mcpServers[server]),
        Boolean(mcpServers[server]) ? 'present' : 'missing'
      );
    }
  }

  if (fs.existsSync(codexHooksPath)) {
    try {
      const hooks = JSON.parse(fs.readFileSync(codexHooksPath, 'utf8'));
      pushResult(results, 'hooks-parse', true, 'hooks.json parsed');
      const text = JSON.stringify(hooks);
      for (const hookCommand of requiredHookCommands) {
        pushResult(
          results,
          `hook:${hookCommand}`,
          text.includes(hookCommand),
          text.includes(hookCommand) ? 'present' : 'missing'
        );
      }
    } catch (error) {
      pushResult(results, 'hooks-parse', false, error.message);
    }
  }

  for (const skill of requiredSkills) {
    const skillPath = path.join(codexRoot, 'skills', skill, 'SKILL.md');
    checkFileExists(results, `skill:${skill}`, skillPath);
  }

  for (const prompt of requiredPrompts) {
    const promptPath = path.join(codexRoot, 'prompts', prompt);
    checkFileExists(results, `prompt:${prompt}`, promptPath);
  }

  for (const reportName of ['sync-summary.md', 'upstream-sync-summary.md']) {
    checkFileExists(results, `report:${reportName}`, path.join(generatedDir, reportName));
  }

  const bridgeStatus = run('node', ['scripts/codex/claude-mem-bridge.js', 'status']);
  pushResult(
    results,
    'claude-mem-bridge:status',
    bridgeStatus.status === 0,
    bridgeStatus.status === 0 ? bridgeStatus.stdout.trim() : (bridgeStatus.stderr || bridgeStatus.stdout || 'failed')
  );

  const watchCheck = run('python', [path.join(codexRoot, 'skills', 'watch', 'scripts', 'setup.py'), '--check']);
  const watchOutput = [watchCheck.stdout, watchCheck.stderr].filter(Boolean).join('\n').trim();
  const watchOk = watchCheck.status === 0;
  pushResult(results, 'watch:setup-check', watchOk, watchOutput || 'ok');

  const portCheck = run('powershell', [
    '-NoProfile',
    '-Command',
    '$url = "http://127.0.0.1:37777/api/search?query=*&limit=1"; $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 3; Write-Output $r.StatusCode'
  ], { timeout: 10000 });
  pushResult(
    results,
    'claude-mem-worker:http',
    portCheck.status === 0 && /200/.test(portCheck.stdout || ''),
    (portCheck.stdout || portCheck.stderr || '').trim() || 'not reachable'
  );

  const failed = results.filter(result => !result.ok);
  const passed = results.length - failed.length;

  const summary = {
    generatedAt: new Date().toISOString(),
    passed,
    failed: failed.length,
    results
  };

  fs.mkdirSync(generatedDir, { recursive: true });
  fs.writeFileSync(
    path.join(generatedDir, 'validation-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`
  );

  const markdown = [
    '# Codex compatibility validation',
    '',
    `- Generated: ${summary.generatedAt}`,
    `- Passed: ${passed}`,
    `- Failed: ${failed.length}`,
    '',
    '## Failures',
    ...(failed.length > 0 ? failed.map(result => `- ${result.name}: ${result.details}`) : ['- None']),
    '',
    '## All checks',
    ...results.map(result => `- [${result.ok ? 'x' : ' '}] ${result.name}: ${result.details}`)
  ].join('\n');

  fs.writeFileSync(path.join(generatedDir, 'validation-summary.md'), `${markdown}\n`);

  console.log(`[codex-validate] Passed ${passed}/${results.length} checks`);
  if (failed.length > 0) {
    console.log(`[codex-validate] Failed ${failed.length} checks`);
    for (const failure of failed) {
      console.log(`- ${failure.name}: ${failure.details}`);
    }
  }
}

main();
