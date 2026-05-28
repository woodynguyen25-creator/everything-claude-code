#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const lastRunPath = path.join(os.homedir(), '.claude', 'logs', 'aios-doctor', 'last-run.json');

if (!fs.existsSync(lastRunPath)) {
  console.log('Doctor has not walked the halls yet.');
  process.exit(0);
}

const raw = fs.readFileSync(lastRunPath, 'utf8');
const doctor = JSON.parse(raw);

console.log(`# AIOS Doctor`);
console.log(`last run: ${doctor.startedAt}`);
console.log(`duration: ${doctor.durationMs}ms`);
console.log(`findings: ${doctor.findings}`);
console.log(`fixed: ${doctor.fixed}`);
console.log(`deferred: ${doctor.deferred}`);

if (doctor.deferredItems?.length) {
  console.log(`\n## Deferred`);
  for (const item of doctor.deferredItems.slice(0, 10)) {
    console.log(`- ${item.area}: ${item.msg}`);
  }
}

if (doctor.fixedItems?.length) {
  console.log(`\n## Healed`);
  for (const item of doctor.fixedItems.slice(0, 10)) {
    console.log(`- ${item.area}: ${item.msg}`);
  }
}
