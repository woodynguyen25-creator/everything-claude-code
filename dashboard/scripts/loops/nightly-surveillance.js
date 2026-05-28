// dashboard/scripts/loops/nightly-surveillance.js
//
// LOOP 5: Sauron's Nightly Surveillance
// Cron: 0 23 * * * (11pm CDT daily)
//
// Pattern: Watch-and-Trigger
// Status: SKELETON — runs end-to-end as a stub, with real LLM calls wiring in once keys are populated.
//
// What it does:
//   1. Loads watch config from data/sauron-watches.json
//   2. For each category, calls the relevant scanners (web search, RSS, social media)
//   3. Filters findings by significance (Haiku triage)
//   4. Generates a digest (Sonnet via fallback to Groq)
//   5. Writes to Obsidian + optionally Telegram (only if high-priority found)
//
// Run manually for testing:
//   node dashboard/scripts/loops/nightly-surveillance.js
//
// Register as scheduled task on Windows (when ready):
//   schtasks /create /tn "Sauron's Watch" /tr "node ...nightly-surveillance.js" /sc daily /st 23:00

const fs = require('node:fs');
const path = require('node:path');
const { route } = require('./lib/router');

// -----------------------------------------------------------------------------
// Config + paths
// -----------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '../../..');
const DATA_DIR = path.resolve(__dirname, '../../data');
const WATCH_CONFIG_PATH = path.join(DATA_DIR, 'sauron-watches.json');
const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT || 'C:\\Users\\woody\\Documents\\Obsidian Vault';
const DIGEST_DIR = path.join(OBSIDIAN_VAULT, "Sauron's Watch");

function nowIso() {
  return new Date().toISOString();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function log(level, msg, meta) {
  const stamp = nowIso();
  const tag = `[sauron:${level}]`;
  if (meta) {
    console.log(`${stamp} ${tag} ${msg}`, JSON.stringify(meta));
  } else {
    console.log(`${stamp} ${tag} ${msg}`);
  }
}

// -----------------------------------------------------------------------------
// Step 1: Load watch config
// -----------------------------------------------------------------------------

function loadWatchConfig() {
  if (!fs.existsSync(WATCH_CONFIG_PATH)) {
    throw new Error(`watch config missing: ${WATCH_CONFIG_PATH}`);
  }
  const raw = fs.readFileSync(WATCH_CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

// -----------------------------------------------------------------------------
// Step 2: Scan each category
// -----------------------------------------------------------------------------

async function scanCategory(name, category) {
  log('scan', `category=${name} weight=${category.weight}`);

  // Build a scanning prompt for the bulk-executor model.
  // It will summarize what's been said across this category's sources in the last 24h.
  const sources = category.sources.map((s) => `- ${s.name}: ${s.url || s.query || s.type}`).join('\n');
  const keywords = (category.geopoliticalKeywords || category.interestKeywords || []).join(', ');

  const systemPrompt = `You are SAURON, Lord Woody's all-seeing eye. You scan, you report. You do NOT speculate beyond evidence. Findings only.`;
  const userPrompt = `Scan the last 24 hours for category "${category.label}".

Sources to consider:
${sources}

Interest keywords: ${keywords}

For each significant finding, output a JSON array entry with shape:
  { "title": "...", "source": "...", "summary": "≤140 chars", "priority": "high|medium|low", "url": "..." }

Output ONLY a JSON array. No prose. If nothing found, output [].`;

  try {
    const result = await route('bulkExecutor', {
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 3000,
    });

    if (!result.ok) {
      log('scan', `failed category=${name}`, { error: result.error });
      return [];
    }

    // Try to parse JSON from the response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log('scan', `no JSON in response for ${name}`);
      return [];
    }

    const findings = JSON.parse(jsonMatch[0]);
    log('scan', `category=${name} findings=${findings.length} via=${result.provider}`);
    return findings.map((f) => ({ ...f, category: name }));
  } catch (err) {
    log('scan', `error category=${name}`, { error: err.message });
    return [];
  }
}

// -----------------------------------------------------------------------------
// Step 3: Significance filter (Haiku triage)
// -----------------------------------------------------------------------------

async function filterSignificance(findings, deliveryRules) {
  log('filter', `processing findings=${findings.length}`);

  if (findings.length === 0) return { high: [], medium: [], low: [] };

  // For each finding, use triage role to classify
  const buckets = { high: [], medium: [], low: [] };

  for (const finding of findings) {
    // Skeleton: trust the priority field from the scanner for now
    // Later: pass each finding through Haiku for a second-pass classification
    const priority = finding.priority || 'low';
    if (priority === 'high') buckets.high.push(finding);
    else if (priority === 'medium') buckets.medium.push(finding);
    else buckets.low.push(finding);
  }

  log('filter', `high=${buckets.high.length} medium=${buckets.medium.length} low=${buckets.low.length}`);
  return buckets;
}

// -----------------------------------------------------------------------------
// Step 4: Generate digest (Sonnet via critic role with degraded fallback)
// -----------------------------------------------------------------------------

async function generateDigest(buckets) {
  const total = buckets.high.length + buckets.medium.length;
  if (total === 0) {
    log('digest', 'nothing significant — skipping digest generation');
    return null;
  }

  const systemPrompt = `You are SAURON, reporting nightly surveillance findings to Lord Woody.
Voice: loyal-menacing surveillance officer. Theatrical opening, then clean ranked lists. Always cite sources. Never speculate.
Format: short greeting → "Scope" line (scanned what, time window) → ranked findings per category → recommendation (1 line, optional).
Max 200 words total.`;

  const findingsBlob = JSON.stringify({ high: buckets.high, medium: buckets.medium }, null, 2);
  const userPrompt = `Write tonight's Sauron's Watch digest. Findings:

${findingsBlob}

Write it now.`;

  // Use Sonnet (Critic role's primary) for the digest writing
  const result = await route('critic', {
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 1500,
  });

  if (!result.ok) {
    log('digest', 'failed to generate', { error: result.error });
    return null;
  }

  log('digest', `generated via=${result.provider} length=${result.text.length}`);
  return result.text;
}

// -----------------------------------------------------------------------------
// Step 5: Deliver — Obsidian + (optional) Telegram
// -----------------------------------------------------------------------------

function saveToObsidian(digest) {
  if (!fs.existsSync(DIGEST_DIR)) {
    fs.mkdirSync(DIGEST_DIR, { recursive: true });
  }
  const dateKey = todayKey();
  const file = path.join(DIGEST_DIR, `${dateKey}.md`);
  const header = `---\nagent: sauron\ndate: ${dateKey}\nscan: nightly-surveillance\n---\n\n# Sauron's Watch — ${dateKey}\n\n`;
  fs.writeFileSync(file, header + digest, 'utf8');
  log('deliver', `obsidian written: ${file}`);
  return file;
}

async function sendTelegram(digest, hasHighPriority) {
  if (!hasHighPriority) {
    log('deliver', 'no high-priority findings — skipping Telegram');
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    log('deliver', 'telegram env vars missing — skipping');
    return;
  }

  const message = `🦅 Sauron's Watch — ${todayKey()}\n\n${digest}`;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) throw new Error(`telegram ${res.status}: ${await res.text()}`);
    log('deliver', 'telegram sent');
  } catch (err) {
    log('deliver', `telegram failed: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// Main entry
// -----------------------------------------------------------------------------

async function main() {
  const started = Date.now();
  log('start', `loop=nightly-surveillance ts=${nowIso()}`);

  try {
    // 1. Load config
    const config = loadWatchConfig();
    log('config', `categories=${Object.keys(config.categories).join(',')}`);

    // 2. Scan each category in parallel
    const categoryScans = Object.entries(config.categories).map(([name, cat]) =>
      scanCategory(name, cat)
    );
    const allFindings = (await Promise.all(categoryScans)).flat();
    log('scan-complete', `total_findings=${allFindings.length}`);

    if (allFindings.length === 0) {
      log('end', 'nothing significant tonight — realm is quiet');
      return;
    }

    // 3. Filter by significance
    const buckets = await filterSignificance(allFindings, config.deliveryRules);

    // 4. Generate digest
    const digest = await generateDigest(buckets);
    if (!digest) {
      log('end', 'no digest generated — nothing high-or-medium priority');
      return;
    }

    // 5. Deliver
    const obsidianFile = saveToObsidian(digest);
    await sendTelegram(digest, buckets.high.length > 0);

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    log('end', `complete in ${elapsed}s, written to ${obsidianFile}`);
  } catch (err) {
    log('fatal', err.message, { stack: err.stack });
    process.exit(1);
  }
}

// Run only if invoked directly
if (require.main === module) {
  main();
}

module.exports = { main, scanCategory, filterSignificance, generateDigest };
