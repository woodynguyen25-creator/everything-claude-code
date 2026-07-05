#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

let TOML;
try {
  TOML = require('@iarna/toml');
} catch {
  console.error('[codex-compat] Missing dependency: @iarna/toml');
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..', '..');
const manifestPath = path.join(repoRoot, 'codex-compat', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const reportOnly = args.has('--report-only');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

const home = os.homedir();
const claudeSkillsDir = path.join(home, '.claude', 'skills');
const codexSkillsDir = path.join(home, '.codex', 'skills');
const codexConfigPath = path.join(home, '.codex', 'config.toml');
const codexHooksPath = path.join(home, '.codex', 'hooks.json');
const generatedDir = path.join(repoRoot, 'codex-compat', 'generated');
const backupsDir = path.join(repoRoot, 'codex-compat', 'backups', timestamp);

const portableDomainMatchers = [
  /memory/i,
  /browser/i,
  /playwright/i,
  /obsidian/i,
  /design/i,
  /frontend/i,
  /dashboard/i,
  /figma/i,
  /trading/i,
  /quant/i,
  /lucky/i,
  /parlay/i,
  /mcp/i,
  /agent/i,
  /workflow/i,
  /video/i,
  /review/i,
  /landing/i
];

function log(message) {
  console.log(`[codex-compat] ${message}`);
}

function ensureDir(dirPath) {
  if (!dryRun) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureLocalDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readHead(filePath, lineLimit = 80) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.split(/\r?\n/).slice(0, lineLimit).join('\n');
}

function getSkillSourceFile(skillDir) {
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillFile)) {
    return { path: skillFile, type: 'skill' };
  }

  const instructionsFile = path.join(skillDir, 'instructions.md');
  if (fs.existsSync(instructionsFile)) {
    return { path: instructionsFile, type: 'instructions' };
  }

  return null;
}

function findClaudeMemSkillDir() {
  const cacheRoot = path.join(home, '.claude', 'plugins', 'cache', 'thedotmack', 'claude-mem');
  if (!fs.existsSync(cacheRoot)) {
    return null;
  }

  const versions = fs.readdirSync(cacheRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' }));

  for (const version of versions) {
    const candidate = path.join(cacheRoot, version, 'skills');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function classifyClaudeSkill(skillName) {
  const skillDir = path.join(claudeSkillsDir, skillName);
  const source = getSkillSourceFile(skillDir);
  const existingCodexSkill = fs.existsSync(path.join(codexSkillsDir, skillName));

  if (!source) {
    return {
      name: skillName,
      sourceType: 'missing',
      portable: false,
      selected: false,
      existingCodexSkill
    };
  }

  const preview = readHead(source.path);
  const portable = !manifest.scan.claudeExclusivePatterns.some(pattern => preview.includes(pattern));
  const priority = Object.entries(manifest.priorities).find(([, names]) => names.includes(skillName))?.[0] || null;
  const categoryMatch = portableDomainMatchers.some(regex => regex.test(skillName));
  const selected = portable && (priority !== null || categoryMatch);

  return {
    name: skillName,
    sourceDir: skillDir,
    sourceFile: source.path,
    sourceType: source.type,
    portable,
    selected,
    existingCodexSkill,
    priority
  };
}

function buildSkillInventory() {
  const skillNames = fs.readdirSync(claudeSkillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => !manifest.scan.excludeNames.includes(name))
    .sort((left, right) => left.localeCompare(right));

  return skillNames.map(classifyClaudeSkill);
}

function copyDirectory(sourceDir, targetDir) {
  if (dryRun) {
    return;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

function ensureSkillMarkdown(targetDir, sourceInfo) {
  if (sourceInfo.sourceType !== 'instructions') {
    return;
  }

  const skillFile = path.join(targetDir, 'SKILL.md');
  if (fs.existsSync(skillFile)) {
    return;
  }

  if (!dryRun) {
    fs.copyFileSync(sourceInfo.sourceFile, skillFile);
  }
}

function writeManagedMarker(targetDir, metadata) {
  const markerPath = path.join(targetDir, '.codex-compat-source.json');
  if (!dryRun) {
    fs.writeFileSync(markerPath, JSON.stringify(metadata, null, 2));
  }
}

function installPortableSkills(inventory) {
  const installed = [];
  const skippedExisting = [];

  for (const skill of inventory) {
    if (!skill.selected) {
      continue;
    }

    if (skill.existingCodexSkill) {
      skippedExisting.push(skill.name);
      continue;
    }

    const targetDir = path.join(codexSkillsDir, skill.name);
    ensureDir(targetDir);
    copyDirectory(skill.sourceDir, targetDir);
    ensureSkillMarkdown(targetDir, skill);
    writeManagedMarker(targetDir, {
      source: skill.sourceDir,
      sourceType: skill.sourceType,
      syncedAt: new Date().toISOString(),
      priority: skill.priority
    });
    installed.push(skill.name);
  }

  return { installed, skippedExisting };
}

function installClaudeMemSkills() {
  const installed = [];
  const skippedMissing = [];
  const resolvedClaudeMemSkillDir = findClaudeMemSkillDir();

  if (!resolvedClaudeMemSkillDir) {
    return { installed, skippedMissing: manifest.claudeMemSkills.map(entry => entry.source) };
  }

  for (const entry of manifest.claudeMemSkills) {
    const sourceDir = path.join(resolvedClaudeMemSkillDir, entry.source);
    if (!fs.existsSync(sourceDir)) {
      skippedMissing.push(entry.source);
      continue;
    }

    const targetDir = path.join(codexSkillsDir, entry.target);
    ensureDir(targetDir);
    copyDirectory(sourceDir, targetDir);
    writeManagedMarker(targetDir, {
      source: sourceDir,
      sourceType: 'claude-mem-plugin',
      syncedAt: new Date().toISOString(),
      priority: entry.priority
    });
    installed.push(entry.target);
  }

  return { installed, skippedMissing };
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  ensureDir(backupsDir);
  const backupPath = path.join(backupsDir, path.basename(filePath));
  if (!dryRun) {
    fs.copyFileSync(filePath, backupPath);
  }
  return backupPath;
}

function formatTomlValue(value) {
  return TOML.stringify({ value }).trim().replace(/^value = /, '');
}

function appendMcpServerSection(rawToml, serverName, fields) {
  const lines = [`[mcp_servers.${serverName}]`];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key} = ${formatTomlValue(value)}`);
  }
  return `${rawToml.trimEnd()}\n\n${lines.join('\n')}\n`;
}

function mergeCodexConfig() {
  if (!fs.existsSync(codexConfigPath)) {
    throw new Error(`Codex config not found: ${codexConfigPath}`);
  }

  const raw = fs.readFileSync(codexConfigPath, 'utf8');
  const parsed = TOML.parse(raw);
  const existingServers = parsed.mcp_servers || {};
  let nextRaw = raw;
  const added = [];

  const bridgeScriptPath = path.join(repoRoot, 'scripts', 'codex', 'claude-mem-bridge.js');
  const tradingviewServerPath = path.join(home, 'TradingView Assistant', 'src', 'server.js');
  const obsidianVaultPath = path.join(home, 'Documents', 'Obsidian Vault');

  const desiredServers = {
    claude_mem: {
      command: 'node',
      args: [bridgeScriptPath, 'mcp'],
      enabled: true,
      startup_timeout_sec: 30
    }
  };

  if (fs.existsSync(tradingviewServerPath)) {
    desiredServers.tradingview = {
      command: 'node',
      args: [tradingviewServerPath],
      enabled: true,
      startup_timeout_sec: 30
    };
  }

  if (fs.existsSync(obsidianVaultPath)) {
    desiredServers.obsidian = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', obsidianVaultPath],
      enabled: true,
      startup_timeout_sec: 30
    };
  }

  for (const [name, fields] of Object.entries(desiredServers)) {
    if (existingServers[name]) {
      continue;
    }
    nextRaw = appendMcpServerSection(nextRaw, name, fields);
    added.push(name);
  }

  if (!dryRun && added.length > 0) {
    backupFile(codexConfigPath);
    fs.writeFileSync(codexConfigPath, nextRaw);
  }

  return { added };
}

function buildHookCommand(commandArgs) {
  const escaped = commandArgs.map(part => {
    if (part.includes('"')) {
      return part;
    }
    return part.includes(' ') ? `"${part}"` : part;
  });
  return escaped.join(' ');
}

function mergeHookArray(existing, nextEntries) {
  const results = Array.isArray(existing) ? [...existing] : [];

  for (const candidate of nextEntries) {
    const exists = results.some(entry => JSON.stringify(entry) === JSON.stringify(candidate));
    if (!exists) {
      results.push(candidate);
    }
  }

  return results;
}

function removeHookCommands(entries, patterns) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map(entry => {
      const nextEntry = { ...entry };
      if (Array.isArray(nextEntry.hooks)) {
        nextEntry.hooks = nextEntry.hooks.filter(hook => {
          const command = hook && typeof hook.command === 'string' ? hook.command : '';
          return !patterns.some(pattern => pattern.test(command));
        });
      }
      return nextEntry;
    })
    .filter(entry => Array.isArray(entry.hooks) ? entry.hooks.length > 0 : true);
}

function mergeCodexHooks() {
  const bridgeScriptPath = path.join(repoRoot, 'scripts', 'codex', 'claude-mem-bridge.js');
  const current = fs.existsSync(codexHooksPath)
    ? JSON.parse(fs.readFileSync(codexHooksPath, 'utf8'))
    : { hooks: {} };

  const next = { hooks: { ...(current.hooks || {}) } };
  const stalePatterns = [
    /claude-mem-bridge\.js"\s+version-check/,
    /version-check\.js/
  ];

  for (const phase of Object.keys(next.hooks)) {
    next.hooks[phase] = removeHookCommands(next.hooks[phase], stalePatterns);
  }

  const additions = {
    SessionStart: [
      {
        matcher: 'startup|resume',
        hooks: [
          {
            type: 'command',
            command: buildHookCommand(['node', bridgeScriptPath, 'worker-start']),
            timeout: 60
          },
          {
            type: 'command',
            command: buildHookCommand(['node', bridgeScriptPath, 'hook', 'context']),
            timeout: 60,
            statusMessage: 'Loading claude-mem context'
          }
        ]
      }
    ],
    UserPromptSubmit: [
      {
        hooks: [
          {
            type: 'command',
            command: buildHookCommand(['node', bridgeScriptPath, 'hook', 'session-init']),
            timeout: 60
          }
        ]
      }
    ],
    PreToolUse: [
      {
        matcher: '^Bash$|^mcp__.+__(read|view|cat)(_file|_files)?$',
        hooks: [
          {
            type: 'command',
            command: buildHookCommand(['node', bridgeScriptPath, 'hook', 'file-context']),
            timeout: 30
          }
        ]
      }
    ],
    PostToolUse: [
      {
        matcher: '.*',
        hooks: [
          {
            type: 'command',
            command: buildHookCommand(['node', bridgeScriptPath, 'hook', 'observation']),
            timeout: 120
          }
        ]
      }
    ],
    Stop: [
      {
        hooks: [
          {
            type: 'command',
            command: buildHookCommand(['node', bridgeScriptPath, 'hook', 'summarize']),
            timeout: 60
          }
        ]
      }
    ]
  };

  for (const [phase, entries] of Object.entries(additions)) {
    next.hooks[phase] = mergeHookArray(next.hooks[phase], entries);
  }

  if (!dryRun) {
    backupFile(codexHooksPath);
    ensureDir(path.dirname(codexHooksPath));
    fs.writeFileSync(codexHooksPath, `${JSON.stringify(next, null, 2)}\n`);
  }

  return {
    addedPhases: Object.keys(additions)
  };
}

function writeReports(summary, inventory) {
  ensureLocalDir(generatedDir);

  const inventoryPath = path.join(generatedDir, 'portable-inventory.json');
  const summaryPath = path.join(generatedDir, 'sync-summary.json');
  const markdownPath = path.join(generatedDir, 'sync-summary.md');

  const markdown = [
    '# Codex compatibility sync',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Dry run: ${dryRun}`,
    `- Portable Claude skills scanned: ${inventory.length}`,
    `- Portable Claude skills selected: ${summary.portableSelected}`,
    `- Codex-native duplicates skipped: ${summary.portableSkippedExisting.length}`,
    `- Portable Claude skills installed: ${summary.portableInstalled.length}`,
    `- claude-mem plugin skills installed: ${summary.claudeMemInstalled.length}`,
    `- MCP servers added: ${summary.configAdded.length}`,
    '',
    '## Installed portable Claude skills',
    ...summary.portableInstalled.map(name => `- ${name}`),
    '',
    '## Installed claude-mem skills',
    ...summary.claudeMemInstalled.map(name => `- ${name}`),
    '',
    '## Skipped existing Codex skills',
    ...summary.portableSkippedExisting.map(name => `- ${name}`)
  ].join('\n');

  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${markdown}\n`);

  return { inventoryPath, summaryPath, markdownPath };
}

function main() {
  if (!fs.existsSync(claudeSkillsDir)) {
    throw new Error(`Claude skills directory not found: ${claudeSkillsDir}`);
  }

  const inventory = buildSkillInventory();
  const selectedPortable = inventory.filter(skill => skill.selected);

  const summary = {
    dryRun,
    portableScanned: inventory.length,
    portableSelected: selectedPortable.length,
    portableInstalled: [],
    portableSkippedExisting: [],
    claudeMemInstalled: [],
    claudeMemSkippedMissing: [],
    configAdded: [],
    hooksAddedPhases: []
  };

  if (!reportOnly) {
    ensureDir(codexSkillsDir);

    const portableResult = installPortableSkills(inventory);
    summary.portableInstalled = portableResult.installed;
    summary.portableSkippedExisting = portableResult.skippedExisting;

    const claudeMemResult = installClaudeMemSkills();
    summary.claudeMemInstalled = claudeMemResult.installed;
    summary.claudeMemSkippedMissing = claudeMemResult.skippedMissing;

    const configResult = mergeCodexConfig();
    summary.configAdded = configResult.added;

    const hookResult = mergeCodexHooks();
    summary.hooksAddedPhases = hookResult.addedPhases;
  }

  const reportPaths = writeReports(summary, inventory);
  log(`Scanned ${summary.portableScanned} Claude skill directories`);
  log(`Selected ${summary.portableSelected} portable Claude skills for Codex`);
  log(`${dryRun ? 'Would install' : 'Installed'} ${summary.portableInstalled.length} portable Claude skills into ~/.codex/skills`);
  log(`${dryRun ? 'Would install' : 'Installed'} ${summary.claudeMemInstalled.length} claude-mem skills into ~/.codex/skills`);
  log(`${dryRun ? 'Would add' : 'Added'} ${summary.configAdded.length} Codex MCP bridge entries`);
  log(`Reports written under ${generatedDir}`);

  if (dryRun) {
    log('Dry run only: no ~/.codex files were changed');
  }

  log(`Summary report: ${reportPaths.markdownPath}`);
}

try {
  main();
} catch (error) {
  console.error(`[codex-compat] ${error.message}`);
  process.exit(1);
}
