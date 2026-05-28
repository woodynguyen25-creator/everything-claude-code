// dashboard/scripts/loops/slate-selection-critic.js
//
// LOOP 2: Slate Selection Critic (Perseus + Thor cross-check)
// Trigger: Manual after ParlayBot generates a slate, OR scheduled 30min before slate lock
// Pattern: Adversarial review — Thor critiques Perseus's slate, Lebot adjudicates
// Status: SKELETON — wire to ParlayBot output when stable.
//
// What it does:
//   STAGE 1: Perseus reads the latest slate from ParlayBot
//   STAGE 2: Thor (the critic) attacks every leg — searches for weak picks, miscalibrations, DNP risk
//   STAGE 3: Lebot reviews both views and issues a verdict per leg: KEEP / SWAP / KILL
//   DELIVER: Telegram + Obsidian (slate-review-{date}.md)
//
// Run manually:
//   node dashboard/scripts/loops/slate-selection-critic.js
//   node dashboard/scripts/loops/slate-selection-critic.js path/to/slate.json
//
// Schedule (when ready):
//   schtasks /create /tn "Slate Critic" /tr "node ...slate-selection-critic.js" /sc daily /st 17:30

const fs = require('node:fs');
const path = require('node:path');
const { route } = require('./lib/router');

// -----------------------------------------------------------------------------
// Config + paths
// -----------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '../../..');
const PARLAY_BOT_OUTPUT = process.env.PARLAY_BOT_SLATE_PATH ||
  path.resolve(REPO_ROOT, '..', 'parlay-bot', 'output', 'today-slate.json');
const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT || 'C:\\Users\\woody\\Documents\\Obsidian Vault';
const REVIEWS_DIR = path.join(OBSIDIAN_VAULT, 'Trading', 'Slate Reviews');

function nowIso() { return new Date().toISOString(); }
function todayKey() { return new Date().toISOString().slice(0, 10); }

function log(stage, msg, meta) {
  const stamp = nowIso();
  const tag = `[slate-critic:${stage}]`;
  if (meta) console.log(`${stamp} ${tag} ${msg}`, JSON.stringify(meta));
  else console.log(`${stamp} ${tag} ${msg}`);
}

// -----------------------------------------------------------------------------
// Load slate
// -----------------------------------------------------------------------------

function loadSlate(customPath) {
  const slatePath = customPath || PARLAY_BOT_OUTPUT;
  if (!fs.existsSync(slatePath)) {
    log('load', `slate not found at ${slatePath}`);
    return null;
  }
  try {
    const raw = fs.readFileSync(slatePath, 'utf8');
    const slate = JSON.parse(raw);
    log('load', `loaded ${slate.legs?.length || 0} legs from ${path.basename(slatePath)}`);
    return slate;
  } catch (err) {
    log('load', `parse error: ${err.message}`);
    return null;
  }
}

// -----------------------------------------------------------------------------
// STAGE 1: Perseus's pitch — explain the slate in his own words
// -----------------------------------------------------------------------------

const PERSEUS_SYSTEM = `You are PERSEUS, Lord Woody's Prince of Parleys. Greek crypto-hero voice — measured, slightly cocky, mathematically precise. You defend your slate with conviction, but never lie about edge. State Kelly fraction, vig-adjusted EV, and lineup confidence per leg.`;

async function perseusPitch(slate) {
  log('perseus', `pitching ${slate.legs?.length || 0} legs`);

  const prompt = `You generated this slate. Write a brief defense — 1 paragraph per leg explaining the edge.

Slate:
${JSON.stringify(slate, null, 2)}

For each leg, output JSON:
  {
    "leg_id": "from slate",
    "pick": "summary in 1 line",
    "edge_thesis": "≤200 chars: where the model sees value",
    "kelly_fraction": "0.0-1.0",
    "vig_adjusted_ev": "expressed as +XX% or -XX%",
    "confidence_factors": ["array of supporting signals"],
    "known_risks": ["array of acknowledged risks"]
  }

Output ONLY a JSON array. Be honest about risks even when defending the pick.`;

  try {
    const result = await route('bulkExecutor', { system: PERSEUS_SYSTEM, prompt, maxTokens: 3000 });
    if (!result.ok) { log('perseus', 'failed', { error: result.error }); return []; }
    const m = result.text.match(/\[[\s\S]*\]/);
    if (!m) return [];
    const pitches = JSON.parse(m[0]);
    log('perseus', `${pitches.length} pitches via ${result.provider}`);
    return pitches;
  } catch (err) {
    log('perseus', 'error', { error: err.message });
    return [];
  }
}

// -----------------------------------------------------------------------------
// STAGE 2: Thor's attack — adversarial review
// -----------------------------------------------------------------------------

const THOR_CRITIC_SYSTEM = `You are THOR, Lord Woody's hammer. In this role you are the ADVERSARIAL CRITIC of Perseus's slate. Your job is to find every reason this slate could fail. Be ruthless. Decisive, no hedging. If a leg is good, say "no quarrel here." If it's weak, say exactly why. Lead with the kill, then the reason. Norse-king cadence — quiet champion confidence.`;

async function thorCritique(slate, perseusPitches) {
  log('thor', `critiquing ${slate.legs?.length || 0} legs`);

  const prompt = `Lord Woody asked you to attack this slate before it locks.

Perseus's slate + pitches:
${JSON.stringify({ slate, perseusPitches }, null, 2)}

For each leg, output JSON:
  {
    "leg_id": "from slate",
    "verdict": "strong | mixed | weak | broken",
    "attack_vectors": ["array of specific risks Thor sees"],
    "missed_in_pitch": "what Perseus didn't address (or 'nothing')",
    "suggested_action": "keep | swap | kill",
    "swap_target": "alternative pick if action=swap, else null",
    "confidence_in_attack": 1-5
  }

Output ONLY a JSON array. If you have no quarrel with a leg, say so. Don't manufacture criticism.`;

  try {
    const result = await route('critic', { system: THOR_CRITIC_SYSTEM, prompt, maxTokens: 4000 });
    if (!result.ok) { log('thor', 'failed', { error: result.error }); return []; }
    const m = result.text.match(/\[[\s\S]*\]/);
    if (!m) return [];
    const attacks = JSON.parse(m[0]);
    log('thor', `${attacks.length} attacks via ${result.provider}`);
    return attacks;
  } catch (err) {
    log('thor', 'error', { error: err.message });
    return [];
  }
}

// -----------------------------------------------------------------------------
// STAGE 3: Lebot adjudicates
// -----------------------------------------------------------------------------

const LEBOT_SYSTEM = `You are LEBOT JAMES, the All-Father of Lord Woody's AIOS. You arbitrate disputes between specialists. Norse-king + LeBron-champion cadence — calm, decisive, never small. Three sentences beats a paragraph. Address Lord Woody as "my Lord" / "King".`;

async function lebotAdjudicate(slate, perseusPitches, thorAttacks) {
  log('lebot', 'adjudicating slate');

  const prompt = `Perseus pitched this slate. Thor attacked it. You decide.

For each leg, decide: KEEP / SWAP / KILL.

Slate:
${JSON.stringify(slate, null, 2)}

Perseus's pitches:
${JSON.stringify(perseusPitches, null, 2)}

Thor's attacks:
${JSON.stringify(thorAttacks, null, 2)}

Output a markdown brief:

## Verdict

**KEEP** (N legs): [list with one-line why]
**SWAP** (N legs): [list with original → suggested]
**KILL** (N legs): [list with one-line why]

## Final Slate Confidence
(One sentence: "Lock with confidence" / "Lock with caution" / "Reduce to N legs" / "Pass on tonight's slate")

## Reasoning
(2-3 sentences — the throne's final word in Norse-king + LeBron voice)`;

  try {
    const result = await route('planner', { system: LEBOT_SYSTEM, prompt, maxTokens: 2000 });
    if (!result.ok) { log('lebot', 'failed', { error: result.error }); return null; }
    log('lebot', `verdict complete via ${result.provider}`);
    return result.text;
  } catch (err) {
    log('lebot', 'error', { error: err.message });
    return null;
  }
}

// -----------------------------------------------------------------------------
// DELIVERY
// -----------------------------------------------------------------------------

function saveToObsidian(slate, perseusPitches, thorAttacks, verdict) {
  if (!fs.existsSync(REVIEWS_DIR)) fs.mkdirSync(REVIEWS_DIR, { recursive: true });

  const dateKey = todayKey();
  const file = path.join(REVIEWS_DIR, `${dateKey}-slate-review.md`);

  const frontmatter = `---
date: ${dateKey}
loop: slate-selection-critic
generated_at: ${nowIso()}
legs: ${slate.legs?.length || 0}
---

# Slate Review — ${dateKey}

`;

  const appendix = `

---

## Source Data

<details>
<summary>Perseus's Pitches</summary>

\`\`\`json
${JSON.stringify(perseusPitches, null, 2)}
\`\`\`
</details>

<details>
<summary>Thor's Attacks</summary>

\`\`\`json
${JSON.stringify(thorAttacks, null, 2)}
\`\`\`
</details>

<details>
<summary>Raw Slate</summary>

\`\`\`json
${JSON.stringify(slate, null, 2)}
\`\`\`
</details>
`;

  fs.writeFileSync(file, frontmatter + (verdict || '(no verdict)') + appendix, 'utf8');
  log('deliver', `obsidian written: ${file}`);
  return file;
}

async function sendTelegram(verdict) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) { log('deliver', 'telegram env missing — skipping'); return; }

  let message = `⚖️ Slate Review — ${todayKey()}\n\n${verdict || '(no verdict)'}`;
  if (message.length > 4000) message = message.slice(0, 3990) + '\n\n…[see Obsidian]';

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
    if (!res.ok) throw new Error(`telegram ${res.status}: ${await res.text()}`);
    log('deliver', 'telegram sent');
  } catch (err) {
    log('deliver', `telegram failed: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const started = Date.now();
  const customPath = process.argv[2];
  log('start', `loop=slate-selection-critic ts=${nowIso()}`);

  try {
    const slate = loadSlate(customPath);
    if (!slate || !slate.legs?.length) { log('end', 'no slate to review'); return; }

    const pitches = await perseusPitch(slate);
    const attacks = await thorCritique(slate, pitches);
    const verdict = await lebotAdjudicate(slate, pitches, attacks);

    const file = saveToObsidian(slate, pitches, attacks, verdict);
    await sendTelegram(verdict);

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    log('end', `complete in ${elapsed}s, saved to ${path.basename(file)}`);
  } catch (err) {
    log('fatal', err.message, { stack: err.stack });
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { main, perseusPitch, thorCritique, lebotAdjudicate };
