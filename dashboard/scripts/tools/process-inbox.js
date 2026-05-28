#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const vault = process.env.OBSIDIAN_VAULT || path.join(os.homedir(), 'Documents', 'Obsidian Vault');
const inboxDir = path.join(vault, '00 Inbox');
const reportsDir = path.join(vault, 'AIOS', 'Reports');
const context = process.env.FORGE_CONTEXT || '';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

ensureDir(reportsDir);

if (!fs.existsSync(inboxDir)) {
  console.log('Inbox folder missing. Nothing to process.');
  process.exit(0);
}

const files = fs
  .readdirSync(inboxDir)
  .filter((file) => file.endsWith('.md'))
  .slice(0, 25)
  .map((file) => {
    const fullPath = path.join(inboxDir, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const tags = Array.from(new Set(raw.match(/#[a-z0-9-]+/gi) || []));
    return { file, tags, excerpt: raw.replace(/\s+/g, ' ').slice(0, 140) };
  });

const reportPath = path.join(reportsDir, `${todayKey()}-inbox-report.md`);
const report = `# Inbox Report — ${todayKey()}

Context captured:
${context || 'No additional answers supplied.'}

## Notes
${files.length ? files.map((entry) => `- **${entry.file}** · tags: ${entry.tags.join(', ') || 'none'}\n  - ${entry.excerpt}`).join('\n') : '- No inbox notes found.'}
`;

fs.writeFileSync(reportPath, report, 'utf8');
console.log(`Inbox report written to ${reportPath}`);
