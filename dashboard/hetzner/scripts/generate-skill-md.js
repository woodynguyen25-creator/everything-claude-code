#!/usr/bin/env node
'use strict';
// Auto-generate SKILL.md wrappers from each skill's skill.yaml.
// Run: node generate-skill-md.js
//
// Each wrapper tells Hermes Agent: "this skill exists, here's what it does, when to use it,
// how to invoke (via PC dashboard ECC bridge)". Lets Hermes discover and reference all 22
// ECC skills alongside its 24 builtin ones via `hermes skills list`.

const fs = require('node:fs');
const path = require('node:path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function parseYaml(text) {
  // Tiny YAML parser — handles flat key:value and list-of-strings only (sufficient for skill.yaml).
  const out = {};
  let currentKey = null;
  let multiline = [];
  let inMultiline = false;
  let listKey = null;

  for (const rawLine of text.split('\n')) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    if (inMultiline) {
      if (/^\s{2,}\S/.test(rawLine) && !rawLine.includes(':')) {
        multiline.push(rawLine.trim());
        continue;
      }
      out[currentKey] = multiline.join(' ');
      inMultiline = false;
      multiline = [];
    }
    if (listKey && rawLine.match(/^\s*-\s+/)) {
      out[listKey] = out[listKey] || [];
      out[listKey].push(rawLine.replace(/^\s*-\s+/, '').trim());
      continue;
    } else if (listKey) {
      listKey = null;
    }
    const m = rawLine.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2];
    if (val === '>' || val === '|') {
      currentKey = key;
      inMultiline = true;
      multiline = [];
    } else if (val === '') {
      listKey = key;
    } else {
      out[key] = val;
    }
  }
  if (inMultiline && currentKey) out[currentKey] = multiline.join(' ');
  return out;
}

function buildSkillMd(skill, slug) {
  const trigger = skill.command || skill.trigger || `/${slug}`;
  const desc = (skill.description || '').trim();
  return `---
name: ${skill.name || slug}
description: ${desc.split('\n').join(' ').slice(0, 280)}
version: ${skill.version || '0.1.0'}
trigger: ${trigger}
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# ${(skill.name || slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}

## What it does

${desc}

## When to use

Use this skill when the user asks for ${slug.replace(/-/g, ' ')}, or invokes the command \`${trigger}\`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → \`100.69.115.98:3738/api/skills/${slug}\`).
The bridge requires \`ECC_BRIDGE_TOKEN\` (already in \`~/.hermes/.env\`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: \`C:\\Github Repos\\everything-claude-code\\dashboard\\hetzner\\skills\\${slug}\\main.py\`
Tests: \`test_${slug.replace(/-/g, '_')}.py\` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit \`skill.yaml\` upstream and re-run \`generate-skill-md.js\` to regenerate.*
`;
}

function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills dir not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  let generated = 0;
  let skipped = 0;

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith('_')) { skipped++; continue; }
    const dir = path.join(SKILLS_DIR, ent.name);
    const yamlPath = path.join(dir, 'skill.yaml');
    if (!fs.existsSync(yamlPath)) { console.warn(`  skip ${ent.name}: no skill.yaml`); skipped++; continue; }
    const skill = parseYaml(fs.readFileSync(yamlPath, 'utf-8'));
    const md = buildSkillMd(skill, ent.name);
    const mdPath = path.join(dir, 'SKILL.md');
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  ✓ ${ent.name}/SKILL.md  (${(skill.description || '').slice(0, 60)}...)`);
    generated++;
  }

  console.log(`\nGenerated: ${generated}  Skipped: ${skipped}`);
}

main();
