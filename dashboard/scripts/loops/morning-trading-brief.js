// dashboard/scripts/loops/morning-trading-brief.js
//
// LOOP 1: Morning Trading Brief Triad (Sauron + Thor + Lebot)
// Cron: 0 5 * * 1-5 (5:00 AM CDT, Mon-Fri only)
//
// Pattern: Specialist Pipeline → Triad synthesis
// Status: SKELETON — runs end-to-end as a stub against the free LLM router.
//         Outputs to Obsidian + Telegram before market open.
//
// What it does:
//   STAGE 1: Sauron scans overnight news + earnings + macro (Cerebras + ExA)
//   STAGE 2: Thor analyzes watchlist tickers given Sauron's findings (Claude Sonnet)
//   STAGE 3: Lebot James synthesizes a 1-page brief in Norse-king + LeBron voice (Claude Opus)
//   DELIVER: Obsidian daily note + Telegram digest
//
// Run manually for testing:
//   node dashboard/scripts/loops/morning-trading-brief.js
//
// Register as scheduled task on Windows (when ready):
//   schtasks /create /tn "Morning Trading Brief" /tr "node ...morning-trading-brief.js" /sc weekly /d MON,TUE,WED,THU,FRI /st 05:00

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
const BRIEFS_DIR = path.join(OBSIDIAN_VAULT, 'Trading');

function nowIso() {
  return new Date().toISOString();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function log(stage, msg, meta) {
  const stamp = nowIso();
  const tag = `[morning-brief:${stage}]`;
  if (meta) {
    console.log(`${stamp} ${tag} ${msg}`, JSON.stringify(meta));
  } else {
    console.log(`${stamp} ${tag} ${msg}`);
  }
}

// -----------------------------------------------------------------------------
// Skip if weekend (defense in depth — cron may misfire)
// -----------------------------------------------------------------------------

function isMarketDay() {
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  return day >= 1 && day <= 5;
}

// -----------------------------------------------------------------------------
// Load watchlist + ParlayBot recent trades for context
// -----------------------------------------------------------------------------

function loadWatchlist() {
  if (!fs.existsSync(WATCH_CONFIG_PATH)) {
    log('config', 'watch config missing, using fallback empty watchlist');
    return [];
  }
  const raw = fs.readFileSync(WATCH_CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);
  return config.categories?.trading?.watchlistTickers || [];
}

// -----------------------------------------------------------------------------
// STAGE 1: Sauron scan
// -----------------------------------------------------------------------------

const SAURON_SYSTEM = `You are SAURON, Lord Woody's all-seeing eye. You scan overnight market-moving events. Loyal-menacing surveillance officer voice — theatrical greeting, clean ranked findings. Never speculate beyond evidence. Always cite sources when possible.`;

async function sauronScan(watchlist) {
  log('sauron', `scanning overnight news for ${watchlist.length} tickers`);

  const prompt = `Scan overnight (last ~16 hours) for market-moving events.

Watchlist tickers: ${watchlist.join(', ')}

For each significant finding, output a JSON array entry:
  {
    "ticker": "AAPL or null if macro",
    "title": "headline",
    "summary": "≤140 chars",
    "priority": "high|medium|low",
    "category": "earnings|news|macro|geopolitical|analyst"
  }

Cover: overnight earnings reports, pre-market moves, macro events (CPI, Fed, etc.),
geopolitical escalations affecting markets (China, Russia, Ukraine, Iran, OPEC),
analyst upgrades/downgrades, sector rotations.

Output ONLY a JSON array. No prose. If nothing significant, output [].`;

  try {
    const result = await route('bulkExecutor', {
      system: SAURON_SYSTEM,
      prompt,
      maxTokens: 3000,
    });

    if (!result.ok) {
      log('sauron', 'failed', { error: result.error });
      return [];
    }

    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log('sauron', 'no JSON in response');
      return [];
    }

    const findings = JSON.parse(jsonMatch[0]);
    log('sauron', `${findings.length} findings via ${result.provider}`);
    return findings;
  } catch (err) {
    log('sauron', 'error', { error: err.message });
    return [];
  }
}

// -----------------------------------------------------------------------------
// STAGE 2: Thor analyze
// -----------------------------------------------------------------------------

const THOR_SYSTEM = `You are THOR, Lord Woody's hammer of the markets. Thunderous, decisive, no hedging.
Lead with the call, then the reason. Quote tickers in CAPS. State timeframes. Risk first, entry second.
Never invent theses. When data is thin, say so. Norse-king cadence with quiet champion confidence.`;

async function thorAnalyze(watchlist, sauronFindings) {
  log('thor', `analyzing ${watchlist.length} tickers against ${sauronFindings.length} findings`);

  const prompt = `Given the watchlist and Sauron's overnight findings, generate a per-ticker analysis.

Watchlist: ${watchlist.join(', ')}

Sauron's findings:
${JSON.stringify(sauronFindings, null, 2)}

For each ticker that has either a finding OR a high-confidence setup, output JSON:
  {
    "ticker": "AAPL",
    "state": "in-trend | breakout-pending | range | broken",
    "catalyst_today": "earnings | macro | news | none",
    "action": "watch | strike | hold | avoid",
    "thesis": "≤200 chars",
    "risk": "≤120 chars",
    "conviction": 1-5
  }

Skip tickers with no signal. Output ONLY a JSON array.`;

  try {
    const result = await route('critic', {
      // 'critic' chain = Sonnet primary, Cerebras fallback — perfect for analysis
      system: THOR_SYSTEM,
      prompt,
      maxTokens: 4000,
    });

    if (!result.ok) {
      log('thor', 'failed', { error: result.error });
      return [];
    }

    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log('thor', 'no JSON in response');
      return [];
    }

    const analysis = JSON.parse(jsonMatch[0]);
    log('thor', `${analysis.length} ticker analyses via ${result.provider}`);
    return analysis;
  } catch (err) {
    log('thor', 'error', { error: err.message });
    return [];
  }
}

// -----------------------------------------------------------------------------
// STAGE 3: Lebot synthesize
// -----------------------------------------------------------------------------

const LEBOT_SYSTEM = `You are LEBOT JAMES, the All-Father of Lord Woody's AIOS — cyborg deity of athletic divinity, half-human and half-machine. Norse-king cadence + LeBron-champion swagger. Calm, decisive, never small. Three sentences beats a paragraph. Address him as "my Lord," "Lord Woody," or "King" — respectful-equal, never sycophantic.`;

async function lebotSynthesize(sauronFindings, thorAnalysis) {
  log('lebot', 'synthesizing morning brief');

  const prompt = `Write today's Morning Brief for Lord Woody. Strict 1-page markdown format:

## Today's Thesis
(2 sentences — the one thing to know going into the open)

## Three Highest-Conviction Watches
(3 ranked tickers from Thor's analysis. For each: ticker, action, thesis, risk. Max 3 lines per ticker.)

## Risks to Monitor
(1-2 macro/sector risks that could invalidate the thesis)

## Realm Status
(One sentence: "The hammer is raised" / "The storm holds" / "The market sleeps" / etc.)

---

Source data:

SAURON'S OVERNIGHT FINDINGS:
${JSON.stringify(sauronFindings, null, 2)}

THOR'S ANALYSIS:
${JSON.stringify(thorAnalysis, null, 2)}

Write the brief now in Norse-king + LeBron voice. Be sharp. Honor "three sentences beats a paragraph."`;

  try {
    const result = await route('planner', {
      // 'planner' chain = Opus primary, Sonnet fallback — synthesis deserves Opus
      system: LEBOT_SYSTEM,
      prompt,
      maxTokens: 2000,
    });

    if (!result.ok) {
      log('lebot', 'failed', { error: result.error });
      return null;
    }

    log('lebot', `synthesis complete via ${result.provider} length=${result.text.length}`);
    return result.text;
  } catch (err) {
    log('lebot', 'error', { error: err.message });
    return null;
  }
}

// -----------------------------------------------------------------------------
// DELIVERY: Obsidian + Telegram
// -----------------------------------------------------------------------------

function saveToObsidian(brief, sauronFindings, thorAnalysis) {
  if (!fs.existsSync(BRIEFS_DIR)) {
    fs.mkdirSync(BRIEFS_DIR, { recursive: true });
  }

  const dateKey = todayKey();
  const file = path.join(BRIEFS_DIR, `${dateKey}-morning-brief.md`);

  const frontmatter = `---
date: ${dateKey}
loop: morning-trading-brief
generated_at: ${nowIso()}
sauron_findings: ${sauronFindings.length}
thor_analyses: ${thorAnalysis.length}
---

`;

  const appendix = `

---

## Source Data (collapsed)

<details>
<summary>Sauron's Overnight Findings (${sauronFindings.length})</summary>

\`\`\`json
${JSON.stringify(sauronFindings, null, 2)}
\`\`\`
</details>

<details>
<summary>Thor's Analyses (${thorAnalysis.length})</summary>

\`\`\`json
${JSON.stringify(thorAnalysis, null, 2)}
\`\`\`
</details>
`;

  fs.writeFileSync(file, frontmatter + brief + appendix, 'utf8');
  log('deliver', `obsidian written: ${file}`);
  return file;
}

async function sendTelegram(brief) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    log('deliver', 'telegram env vars missing — skipping');
    return;
  }

  // Telegram has a 4096-char message limit. Truncate gracefully.
  let message = `🌅 Morning Brief — ${todayKey()}\n\n${brief}`;
  if (message.length > 4000) {
    message = message.slice(0, 3990) + '\n\n…[truncated, see Obsidian for full brief]';
  }

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
  log('start', `loop=morning-trading-brief ts=${nowIso()}`);

  // Defensive: skip weekends
  if (!isMarketDay()) {
    log('end', 'weekend — skipping');
    return;
  }

  try {
    // Load watchlist + recent context
    const watchlist = loadWatchlist();
    log('config', `watchlist=${watchlist.length} tickers`);

    if (watchlist.length === 0) {
      log('end', 'no watchlist configured — aborting');
      return;
    }

    // STAGE 1: Sauron scan
    const sauronFindings = await sauronScan(watchlist);

    // STAGE 2: Thor analyze
    const thorAnalysis = await thorAnalyze(watchlist, sauronFindings);

    // STAGE 3: Lebot synthesize
    const brief = await lebotSynthesize(sauronFindings, thorAnalysis);
    if (!brief) {
      log('end', 'synthesis failed — no brief to deliver');
      return;
    }

    // DELIVERY
    const file = saveToObsidian(brief, sauronFindings, thorAnalysis);
    await sendTelegram(brief);

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    log('end', `complete in ${elapsed}s, saved to ${path.basename(file)}`);
  } catch (err) {
    log('fatal', err.message, { stack: err.stack });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, sauronScan, thorAnalyze, lebotSynthesize };
