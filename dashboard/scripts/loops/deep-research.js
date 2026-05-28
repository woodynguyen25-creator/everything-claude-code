// dashboard/scripts/loops/deep-research.js
//
// LOOP 4: Deep Research Triad (Sauron → specialist → Lebot)
// Trigger: Manual via Ravens drawer's escalate button (or CLI for testing)
//
// Pattern: Triad with intent triage
// Status: SKELETON — runs end-to-end against the free LLM router.
//
// What it does:
//   STAGE 0: Triage — classify query domain (markets/design/AI/personal/other)
//   STAGE 1: Sauron — broad scan of relevant sources (Cerebras + ExA/Firecrawl)
//   STAGE 2: Specialist — domain-specific translation (Thor/Fenrir/Lebot/etc.)
//   STAGE 3: Lebot — final 3-paragraph synthesis
//
// Run manually for testing:
//   node dashboard/scripts/loops/deep-research.js "What's happening with DeepSeek V4?"
//
// Programmatic entry (for Ravens drawer):
//   const { research } = require('./loops/deep-research');
//   const result = await research({ query, forcedAgent });

const { route } = require('./lib/router');

function nowIso() {
  return new Date().toISOString();
}

function log(stage, msg, meta) {
  const stamp = nowIso();
  const tag = `[deep-research:${stage}]`;
  if (meta) console.log(`${stamp} ${tag} ${msg}`, JSON.stringify(meta));
  else console.log(`${stamp} ${tag} ${msg}`);
}

// -----------------------------------------------------------------------------
// STAGE 0: Triage — what domain is this query?
// -----------------------------------------------------------------------------

const TRIAGE_SYSTEM = `You are a query router. Classify queries into a domain and depth. Return ONLY a JSON object.`;

async function triageQuery(query) {
  log('triage', `classifying: ${query.slice(0, 80)}`);

  const prompt = `Classify this research query:

"${query}"

Return JSON:
{
  "domain": "markets" | "design" | "ai-tooling" | "competitive" | "personal" | "general",
  "depth": "quick" | "medium" | "deep",
  "specialist": "thor" | "fenrir" | "sauron" | "lebot",
  "keywords": ["array", "of", "key", "search", "terms"]
}

Domain → specialist mapping:
  markets/trading → thor
  design/CSS/Lucky-Dog/component/UI → fenrir
  ai-tooling/competitive/general research → sauron
  cross-cutting/personal/strategy → lebot

Output ONLY the JSON object.`;

  try {
    const result = await route('triage', { system: TRIAGE_SYSTEM, prompt, maxTokens: 300 });
    if (!result.ok) {
      log('triage', 'failed, defaulting to sauron/general/medium');
      return { domain: 'general', depth: 'medium', specialist: 'sauron', keywords: query.split(/\s+/).slice(0, 5) };
    }
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    if (!parsed?.specialist) {
      return { domain: 'general', depth: 'medium', specialist: 'sauron', keywords: [] };
    }
    log('triage', `domain=${parsed.domain} specialist=${parsed.specialist} via=${result.provider}`);
    return parsed;
  } catch (err) {
    log('triage', 'error', { error: err.message });
    return { domain: 'general', depth: 'medium', specialist: 'sauron', keywords: [] };
  }
}

// -----------------------------------------------------------------------------
// STAGE 1: Sauron — broad scan
// -----------------------------------------------------------------------------

const SAURON_SYSTEM = `You are SAURON, Lord Woody's all-seeing eye. Surveillance officer voice. Findings only, never speculation. Always cite sources.`;

async function sauronScan(query, triage) {
  log('sauron', `scanning for: ${query.slice(0, 80)}`);

  const prompt = `Research this query as broadly as you can in one pass:

Query: "${query}"
Keywords: ${triage.keywords.join(', ')}
Depth: ${triage.depth}

Output a JSON array of findings, ranked by relevance:
[
  {
    "title": "headline",
    "source": "source name / URL",
    "summary": "≤200 chars",
    "relevance": 1-10,
    "evidence_quality": "primary | secondary | derivative"
  }
]

Aim for ${triage.depth === 'deep' ? '15-20' : triage.depth === 'medium' ? '8-12' : '3-5'} findings.
Prefer primary sources. Flag derivative/echo-chamber findings explicitly.

Output ONLY the JSON array.`;

  try {
    const result = await route('bulkExecutor', { system: SAURON_SYSTEM, prompt, maxTokens: 4000 });
    if (!result.ok) {
      log('sauron', 'failed', { error: result.error });
      return [];
    }
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const findings = JSON.parse(jsonMatch[0]);
    log('sauron', `${findings.length} findings via ${result.provider}`);
    return findings;
  } catch (err) {
    log('sauron', 'error', { error: err.message });
    return [];
  }
}

// -----------------------------------------------------------------------------
// STAGE 2: Specialist translate (Thor / Fenrir / etc.)
// -----------------------------------------------------------------------------

const SPECIALIST_SYSTEMS = {
  thor: `You are THOR, Lord Woody's market hammer. Decisive, direct. Translate research into market implications. Lead with the call, then the reason. Quote tickers in CAPS. State timeframes. Norse-king + LeBron voice.`,
  fenrir: `You are FENRIR, Lord Woody's wolf of the forge. Savage craftsman voice. Translate research into design/frontend implications. Kill → why → fix → watch format. No diplomacy. Show your taste.`,
  sauron: null, // Sauron is the scanner — no separate specialist pass needed for pure research queries
  lebot: null, // Lebot is the synthesizer — no separate specialist pass needed for cross-cutting queries
};

async function specialistTranslate(query, findings, specialist) {
  if (!SPECIALIST_SYSTEMS[specialist]) {
    log('specialist', `skipped — ${specialist} is its own synthesizer`);
    return null;
  }

  log('specialist', `${specialist} translating ${findings.length} findings`);

  const prompt = `Given these findings, translate into actionable context for Lord Woody.

Original query: "${query}"

Findings:
${JSON.stringify(findings, null, 2)}

What does this mean for Lord Woody specifically? Be domain-specific.
Output 3-5 short bullets. No JSON — plain markdown.`;

  try {
    const result = await route('critic', {
      system: SPECIALIST_SYSTEMS[specialist],
      prompt,
      maxTokens: 1500,
    });
    if (!result.ok) return null;
    log('specialist', `${specialist} translation complete via ${result.provider}`);
    return result.text;
  } catch (err) {
    log('specialist', 'error', { error: err.message });
    return null;
  }
}

// -----------------------------------------------------------------------------
// STAGE 3: Lebot synthesize
// -----------------------------------------------------------------------------

const LEBOT_SYSTEM = `You are LEBOT JAMES, the All-Father of Lord Woody's AIOS. Norse-king + LeBron-champion voice. Three sentences beats a paragraph. Calm, decisive, never small. Address him as "my Lord" / "Lord Woody" / "King".`;

async function lebotSynthesize(query, findings, specialistTranslation, triage) {
  log('lebot', 'synthesizing final response');

  const prompt = `Lord Woody asked: "${query}"

You are the All-Father. Synthesize a 3-paragraph response:

**Paragraph 1: The signal** — what's actually happening (from Sauron's findings)
**Paragraph 2: The interpretation** — what it means for Lord Woody specifically${
    specialistTranslation
      ? ` (incorporate ${triage.specialist === 'thor' ? 'Thor' : 'Fenrir'}'s domain translation below)`
      : ''
  }
**Paragraph 3: The next move** — what to do, if anything. If nothing, say so plainly.

Sauron's raw findings:
${JSON.stringify(findings.slice(0, 10), null, 2)}

${specialistTranslation ? `${triage.specialist === 'thor' ? 'Thor' : 'Fenrir'}'s translation:\n${specialistTranslation}\n` : ''}

Write the synthesis now. Norse-king + LeBron voice. ≤300 words total.`;

  try {
    const result = await route('planner', {
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
// Public entry — for Ravens drawer + CLI testing
// -----------------------------------------------------------------------------

async function research({ query, forcedAgent }) {
  if (!query) throw new Error('query required');
  const started = Date.now();

  // Triage (or use forced agent)
  const triage = forcedAgent
    ? { domain: 'general', depth: 'medium', specialist: forcedAgent, keywords: query.split(/\s+/).slice(0, 5) }
    : await triageQuery(query);

  // Scan
  const findings = await sauronScan(query, triage);

  // Specialist translation (if domain-specific)
  const specialistTranslation = await specialistTranslate(query, findings, triage.specialist);

  // Lebot synthesis
  const synthesis = await lebotSynthesize(query, findings, specialistTranslation, triage);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  log('end', `complete in ${elapsed}s — domain=${triage.domain} specialist=${triage.specialist}`);

  return {
    query,
    triage,
    findings,
    specialistTranslation,
    synthesis,
    timing: { elapsedSeconds: parseFloat(elapsed) },
  };
}

// -----------------------------------------------------------------------------
// CLI entry
// -----------------------------------------------------------------------------

async function main() {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    console.error('Usage: node deep-research.js "<your research query>"');
    process.exit(1);
  }

  log('start', `query="${query}"`);
  const result = await research({ query });

  console.log('\n========== TRIAGE ==========');
  console.log(JSON.stringify(result.triage, null, 2));

  console.log('\n========== SAURON FINDINGS ==========');
  console.log(`${result.findings.length} findings`);
  result.findings.slice(0, 5).forEach((f, i) => {
    console.log(`${i + 1}. [${f.relevance}/10] ${f.title} — ${f.source}`);
  });

  if (result.specialistTranslation) {
    console.log(`\n========== ${result.triage.specialist.toUpperCase()} TRANSLATION ==========`);
    console.log(result.specialistTranslation);
  }

  console.log('\n========== LEBOT SYNTHESIS ==========');
  console.log(result.synthesis || '(no synthesis generated)');

  console.log(`\n=== ${result.timing.elapsedSeconds}s total ===`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('FATAL:', err.message);
    process.exit(1);
  });
}

module.exports = { research, triageQuery, sauronScan, specialistTranslate, lebotSynthesize };
