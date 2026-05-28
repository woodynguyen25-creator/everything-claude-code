#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const vault = process.env.OBSIDIAN_VAULT || path.join(os.homedir(), 'Documents', 'Obsidian Vault');
const reportsDir = path.join(vault, 'AIOS', 'Reports');
const context = process.env.FORGE_CONTEXT || '';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.obsidian') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(fullPath);
    }
  }
  return out;
}

ensureDir(reportsDir);

const files = walk(vault);
const basenameMap = new Map();
const brokenLinks = [];

for (const file of files) {
  const base = path.basename(file).toLowerCase();
  basenameMap.set(base, [...(basenameMap.get(base) || []), file]);

  const raw = fs.readFileSync(file, 'utf8');
  const wikiLinks = raw.match(/\[\[[^\]]+\]\]/g) || [];
  for (const link of wikiLinks) {
    const target = link.slice(2, -2).split('|')[0].trim().toLowerCase();
    const matches = files.filter((candidate) => path.basename(candidate, '.md').toLowerCase() === target);
    if (matches.length === 0) {
      brokenLinks.push({ file, link });
    }
  }
}

const duplicates = [...basenameMap.entries()].filter(([, paths]) => paths.length > 1);

const reportPath = path.join(reportsDir, `${todayKey()}-vault-cleanup.md`);
const report = `# Vault Cleanup — ${todayKey()}

Context captured:
${context || 'No additional answers supplied.'}

## Duplicate file names
${duplicates.length ? duplicates.map(([name, matches]) => `- **${name}**\n${matches.map((match) => `  - ${match}`).join('\n')}`).join('\n') : '- No duplicate basenames found.'}

## Broken wikilinks
${brokenLinks.length ? brokenLinks.slice(0, 50).map((entry) => `- ${entry.link} in ${entry.file}`).join('\n') : '- No broken wikilinks found.'}
`;

fs.writeFileSync(reportPath, report, 'utf8');
console.log(`Vault cleanup report written to ${reportPath}`);
