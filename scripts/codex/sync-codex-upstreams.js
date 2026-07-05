#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const manifestPath = path.join(repoRoot, 'codex-compat', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const generatedDir = path.join(repoRoot, 'codex-compat', 'generated');

const codexSkillsDir = path.join(os.homedir(), '.codex', 'skills');
const codexPromptsDir = path.join(os.homedir(), '.codex', 'prompts');

function log(message) {
  console.log(`[codex-upstreams] ${message}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function findSkillDirectories(rootDir, recursive) {
  const results = [];

  function visit(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    if (entries.some(entry => entry.isFile() && entry.name === 'SKILL.md')) {
      results.push(currentDir);
      return;
    }

    if (!recursive) {
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const childDir = path.join(currentDir, entry.name);
        const childEntries = fs.readdirSync(childDir, { withFileTypes: true });
        if (childEntries.some(child => child.isFile() && child.name === 'SKILL.md')) {
          results.push(childDir);
        }
      }
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      visit(path.join(currentDir, entry.name));
    }
  }

  visit(rootDir);
  return results.sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

function filterSkillDirectories(skillDirs, filterNames) {
  if (!Array.isArray(filterNames) || filterNames.length === 0) {
    return skillDirs;
  }

  const allowed = new Set(filterNames);
  return skillDirs.filter(skillDir => allowed.has(path.basename(skillDir)));
}

function installSkillDir(sourceDir) {
  const skillName = path.basename(sourceDir);
  const targetDir = path.join(codexSkillsDir, skillName);
  if (fs.existsSync(targetDir)) {
    return { skillName, installed: false, reason: 'exists' };
  }

  fs.cpSync(sourceDir, targetDir, { recursive: true });
  fs.writeFileSync(
    path.join(targetDir, '.codex-upstream-source.json'),
    JSON.stringify(
      {
        source: sourceDir,
        syncedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
  return { skillName, installed: true };
}

function installPromptFile(sourcePath) {
  const promptName = path.basename(sourcePath);
  const targetPath = path.join(codexPromptsDir, promptName);
  if (fs.existsSync(targetPath)) {
    return { promptName, installed: false, reason: 'exists' };
  }

  fs.copyFileSync(sourcePath, targetPath);
  return { promptName, installed: true };
}

function main() {
  ensureDir(codexSkillsDir);
  ensureDir(codexPromptsDir);
  ensureDir(generatedDir);

  const installedSkills = [];
  const skippedSkills = [];
  const installedPrompts = [];
  const skippedPrompts = [];

  for (const library of manifest.externalSources.skillLibraries) {
    const root = path.join(repoRoot, library.path);
    if (!fs.existsSync(root)) {
      skippedSkills.push({ source: library.name, reason: 'missing-root' });
      continue;
    }

    const skillDirs = filterSkillDirectories(
      findSkillDirectories(root, library.mode === 'recursive'),
      library.filterNames
    );
    for (const skillDir of skillDirs) {
      const result = installSkillDir(skillDir);
      if (result.installed) {
        installedSkills.push({ source: library.name, name: result.skillName });
      } else {
        skippedSkills.push({ source: library.name, name: result.skillName, reason: result.reason });
      }
    }
  }

  for (const promptSource of manifest.externalSources.prompts) {
    const root = path.join(repoRoot, promptSource.path);
    if (!fs.existsSync(root)) {
      skippedPrompts.push({ source: promptSource.name, reason: 'missing-root' });
      continue;
    }

    const promptFiles = fs.readdirSync(root, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => path.join(root, entry.name))
      .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));

    for (const promptFile of promptFiles) {
      const result = installPromptFile(promptFile);
      if (result.installed) {
        installedPrompts.push({ source: promptSource.name, name: result.promptName });
      } else {
        skippedPrompts.push({ source: promptSource.name, name: result.promptName, reason: result.reason });
      }
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    installedSkills,
    skippedSkills,
    installedPrompts,
    skippedPrompts,
    deferred: manifest.externalSources.deferred
  };

  fs.writeFileSync(
    path.join(generatedDir, 'upstream-sync-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`
  );

  const markdown = [
    '# Codex upstream sync',
    '',
    `- Generated: ${summary.generatedAt}`,
    `- Installed skills: ${installedSkills.length}`,
    `- Installed prompts: ${installedPrompts.length}`,
    '',
    '## Installed skills',
    ...installedSkills.map(entry => `- ${entry.name} (${entry.source})`),
    '',
    '## Installed prompts',
    ...installedPrompts.map(entry => `- ${entry.name} (${entry.source})`),
    '',
    '## Deferred',
    ...summary.deferred.map(entry => `- ${entry.name}: ${entry.reason}`)
  ].join('\n');

  fs.writeFileSync(path.join(generatedDir, 'upstream-sync-summary.md'), `${markdown}\n`);

  log(`Installed ${installedSkills.length} upstream skills into ~/.codex/skills`);
  log(`Installed ${installedPrompts.length} upstream prompts into ~/.codex/prompts`);
  log(`Summary report: ${path.join(generatedDir, 'upstream-sync-summary.md')}`);
}

main();
