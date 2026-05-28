// dashboard/scripts/loops/weekly-wyrd.js
//
// LOOP 5: Weekly Wyrd (Lebot writes Sunday review to Obsidian)
// Schedule: Sunday 6:00 PM CDT (0 18 * * 0)
// Pattern: Solo synthesis — Lebot reads the week's data, writes the review
// Status: SKELETON — wire to Task Scheduler when stable.
//
// What it does:
//   STAGE 1: Aggregate the week's data:
//     - Closed trades (from Obsidian Vault\TradingView Assistant\Trades\Closed)
//     - Sagas written (from Obsidian Vault\Daily Notes)
//     - Morning briefs run (from Obsidian Vault\Trading)
//     - Doctor critical flags (from ~/.claude/logs/aios-doctor/)
//     - Pinned memories from this week
//   STAGE 2: Lebot synthesizes a Norse-king + LeBron weekly review
//   DELIVER: Obsidian weekly note + Telegram
//
// Run manually:
//   node dashboard/scripts/loops/weekly-wyrd.js
//
// Schedule (when ready):
//   schtasks /create /tn "Weekly Wyrd" /tr "node ...weekly-wyrd.js" /sc weekly /d SUN /st 18:00

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { route } = require('./lib/router');

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT || 'C:\\Users\\woody\\Documents\\Obsidian Vault';
const CLOSED_TRADES_DIR = path.join(OBSIDIAN_VAULT, 'TradingView Assistant', 'Trades', 'Closed');
const DAILY_NOTES_DIR = path.join(OBSIDIAN_VAULT, 'Daily Notes');
const MORNING_BRIEFS_DIR = path.join(OBSIDIAN_VAULT, 'Trading');
const WEEKLY_REVIEWS_DIR = path.join(OBSIDIAN_VAULT, 'Weekly Wyrd');
const DOCTOR_LOGS_DIR = path.join(os.homedir(), '.claude', 'logs', 'aios-doctor');
const MEMORY_DIR = path.join(
  os.homedir(),
  '.claude',
  'projects',
  'c--Github-Repos-everything-claude-code',
  'memory'
);

function nowIso() { return new Date().toISOString(); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function weekKey() {
  // ISO week-year format: 2026-W19
  const d = new Date();
  const dayNum = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayNum + 3);
  const firstThursday = d.valueOf();
  d.setMonth(0, 1);
  if (d.getDay() !== 4) d.setMonth(0, 1 + ((4 - d.getDay()) + 7) % 7);
  const week = 1 + Math.ceil((firstThursday - d.valueOf()) / 604800000);
  return `${new Date().getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function log(stage, msg, meta) {
  const stamp = nowIso();
  const tag = `[weekly-wyrd:${stage}]`;
  if (meta) console.log(`${stamp} ${tag} ${msg}`, JSON.stringify(meta));
  else console.log(`${stamp} ${tag} ${msg}`);
}

// -----------------------------------------------------------------------------
// Date helpers
// -----------------------------------------------------------------------------

function pastWeekRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  return { start, end };
}

function isInPastWeek(date) {
  const { start, end } = pastWeekRange();
  return date >= start && date <= end;
}

function listFilesInRange(dir, ext = '.md') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      return { path: fp, name: f, mtime: stat.mtime };
    })
    .filter((f) => isInPastWeek(f.mtime))
    .sort((a, b) => b.mtime - a.mtime);
}

// -----------------------------------------------------------------------------
// STAGE 1: Aggregate week's data
// -----------------------------------------------------------------------------

function readFileSafe(filePath, maxBytes = 5000) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > maxBytes) {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(maxBytes);
      fs.readSync(fd, buf, 0, maxBytes, 0);
      fs.closeSync(fd);
      return buf.toString('utf8') + '\n...[truncated]';
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return null;
  }
}

function aggregateWeek() {
  log('aggregate', 'gathering week data');

  const closedTrades = listFilesInRange(CLOSED_TRADES_DIR).map((f) => ({
    name: f.name,
    closedAt: f.mtime.toISOString(),
    excerpt: (readFileSafe(f.path, 2000) || '').slice(0, 1500),
  }));

  const dailyNotes = listFilesInRange(DAILY_NOTES_DIR).map((f) => ({
    date: f.name.replace('.md', ''),
    excerpt: (readFileSafe(f.path, 1500) || '').slice(0, 1000),
  }));

  const morningBriefs = listFilesInRange(MORNING_BRIEFS_DIR).map((f) => ({
    date: f.name.replace(/-morning-brief\.md$/, ''),
    headlines: (readFileSafe(f.path, 800) || '').slice(0, 600),
  }));

  // Doctor critical flags (look in logs)
  let doctorFlags = [];
  try {
    if (fs.existsSync(DOCTOR_LOGS_DIR)) {
      const savepoints = path.join(DOCTOR_LOGS_DIR, 'savepoints');
      if (fs.existsSync(savepoints)) {
        doctorFlags = fs.readdirSync(savepoints)
          .filter((f) => f.endsWith('.json'))
          .map((f) => ({ path: path.join(savepoints, f), name: f, mtime: fs.statSync(path.join(savepoints, f)).mtime }))
          .filter((f) => isInPastWeek(f.mtime))
          .slice(0, 10)
          .map((f) => ({ name: f.name, at: f.mtime.toISOString() }));
      }
    }
  } catch (err) {
    log('aggregate', `doctor flags read failed: ${err.message}`);
  }

  // Memories pinned this week
  let pinnedMemories = [];
  try {
    if (fs.existsSync(MEMORY_DIR)) {
      pinnedMemories = fs.readdirSync(MEMORY_DIR)
        .filter((f) => f.startsWith('ravens-') && f.endsWith('.md'))
        .map((f) => ({ path: path.join(MEMORY_DIR, f), name: f, mtime: fs.statSync(path.join(MEMORY_DIR, f)).mtime }))
        .filter((f) => isInPastWeek(f.mtime))
        .slice(0, 20)
        .map((f) => ({ name: f.name, at: f.mtime.toISOString(), excerpt: (readFileSafe(f.path, 600) || '').slice(0, 400) }));
    }
  } catch (err) {
    log('aggregate', `memories read failed: ${err.message}`);
  }

  log('aggregate', `trades=${closedTrades.length} sagas=${dailyNotes.length} briefs=${morningBriefs.length} doctor=${doctorFlags.length} memories=${pinnedMemories.length}`);

  return { closedTrades, dailyNotes, morningBriefs, doctorFlags, pinnedMemories };
}

// -----------------------------------------------------------------------------
// STAGE 2: Lebot synthesizes
// -----------------------------------------------------------------------------

const LEBOT_SYSTEM = `You are LEBOT JAMES, the All-Father of Lord Woody's AIOS. Sunday is when the throne reviews the week. Norse-king + LeBron-champion voice. Calm, decisive, never small. Three sentences beats a paragraph. Address Lord Woody as "my Lord" / "King". Lead with the truth, then the next move.`;

async function lebotSynthesize(weekData) {
  log('lebot', 'synthesizing weekly review');

  const week = weekKey();
  const { closedTrades, dailyNotes, morningBriefs, doctorFlags, pinnedMemories } = weekData;

  const prompt = `Write Lord Woody's Weekly Wyrd for ${week}. Synthesize the week from these sources.

CLOSED TRADES (${closedTrades.length}):
${JSON.stringify(closedTrades.slice(0, 10), null, 2)}

DAILY SAGAS (${dailyNotes.length}):
${JSON.stringify(dailyNotes.slice(0, 7), null, 2)}

MORNING BRIEFS (${morningBriefs.length}):
${JSON.stringify(morningBriefs.slice(0, 5), null, 2)}

DOCTOR FLAGS (${doctorFlags.length}):
${JSON.stringify(doctorFlags.slice(0, 5), null, 2)}

PINNED MEMORIES (${pinnedMemories.length}):
${JSON.stringify(pinnedMemories.slice(0, 10), null, 2)}

Output strict markdown:

# Weekly Wyrd — ${week}

## The Throne's Read
(2 sentences — the truth of the week. What was real, what was noise.)

## What Held
(3 bullets — what kept its shape. Wins, disciplines kept, ideas that landed.)

## What Slipped
(3 bullets — what failed or drifted. Be honest. No flattery.)

## The Wyrd Ahead
(2 sentences — what next week demands. The Norns aren't subtle this time.)

## Standing Orders
(3 bullets — concrete actions for the next 7 days. Each one starts with a verb.)

---

Voice rules:
- Norse-king + LeBron-champion cadence
- Three sentences beats a paragraph
- Never sycophantic. The All-Father speaks straight.
- If the week was bad, say so. The throne survives truth.
- If the week was strong, name it without exaggeration.`;

  try {
    const result = await route('planner', { system: LEBOT_SYSTEM, prompt, maxTokens: 3000 });
    if (!result.ok) { log('lebot', 'failed', { error: result.error }); return null; }
    log('lebot', `synthesis complete via ${result.provider}`);
    return result.text;
  } catch (err) {
    log('lebot', 'error', { error: err.message });
    return null;
  }
}

// -----------------------------------------------------------------------------
// Delivery
// -----------------------------------------------------------------------------

function saveToObsidian(review, weekData) {
  if (!fs.existsSync(WEEKLY_REVIEWS_DIR)) fs.mkdirSync(WEEKLY_REVIEWS_DIR, { recursive: true });

  const week = weekKey();
  const file = path.join(WEEKLY_REVIEWS_DIR, `${week}.md`);

  const frontmatter = `---
week: ${week}
loop: weekly-wyrd
generated_at: ${nowIso()}
trades_closed: ${weekData.closedTrades.length}
sagas_written: ${weekData.dailyNotes.length}
briefs_run: ${weekData.morningBriefs.length}
doctor_flags: ${weekData.doctorFlags.length}
memories_pinned: ${weekData.pinnedMemories.length}
---

`;

  const appendix = `

---

## Source Data

<details>
<summary>Aggregated Week Data (raw)</summary>

\`\`\`json
${JSON.stringify(weekData, null, 2)}
\`\`\`
</details>
`;

  fs.writeFileSync(file, frontmatter + review + appendix, 'utf8');
  log('deliver', `obsidian written: ${file}`);
  return file;
}

async function sendTelegram(review) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) { log('deliver', 'telegram env missing — skipping'); return; }

  // Send the full review but truncated if needed
  let message = `📜 Weekly Wyrd — ${weekKey()}\n\n${review}`;
  if (message.length > 4000) message = message.slice(0, 3990) + '\n\n…[full review in Obsidian]';

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
  log('start', `loop=weekly-wyrd ts=${nowIso()}`);

  try {
    const weekData = aggregateWeek();
    const review = await lebotSynthesize(weekData);
    if (!review) { log('end', 'synthesis failed'); return; }

    const file = saveToObsidian(review, weekData);
    await sendTelegram(review);

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    log('end', `complete in ${elapsed}s, saved to ${path.basename(file)}`);
  } catch (err) {
    log('fatal', err.message, { stack: err.stack });
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { main, aggregateWeek, lebotSynthesize };
