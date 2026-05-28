#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const { spawnSync } = require('node:child_process');
const {
  route,
  MODEL_MAP,
  callCerebras,
  callDeepSeek,
  callGroq,
  callGemini,
  callOllama,
  callCodex,
} = require('../loops/lib/router');

const repoRoot = path.resolve(__dirname, '../../..');
const dashboardRoot = path.join(repoRoot, 'dashboard');
const dataDir = path.join(dashboardRoot, 'data');
const triadUsagePath = path.join(dataDir, 'triad-usage.json');
const tasksDbPath = path.join(dataDir, 'tasks.db');
const aiosStatsPath = path.join(dataDir, 'aios-stats.json');
const vault = process.env.OBSIDIAN_VAULT || path.join(os.homedir(), 'Documents', 'Obsidian Vault');

const deepseekPricing = { inputPerM: 0.27, outputPerM: 1.1 };
const deepseekSoftCap = 0.5;
const deepseekHardCap = 1.5;

const ACTION_CONFIG = {
  'morning-brief': {
    mode: 'triad',
    hall: 'Trading',
    kind: 'loop',
    script: ['node', path.join(dashboardRoot, 'scripts', 'loops', 'morning-trading-brief.js')],
    specialist: 'Thor',
  },
  'deep-research': {
    mode: 'quad',
    hall: 'AIOS',
    kind: 'loop',
    script: ['node', path.join(dashboardRoot, 'scripts', 'loops', 'deep-research.js')],
    specialist: 'Sauron',
  },
  'plan-today': {
    mode: 'triad',
    hall: 'AIOS',
    kind: 'llm',
    specialist: 'Lebot James',
  },
  'process-inbox': {
    mode: 'triad',
    hall: 'AIOS',
    kind: 'llm',
    specialist: 'Lebot James',
  },
  'weekly-review': {
    mode: 'triad',
    hall: 'AIOS',
    kind: 'loop',
    script: ['node', path.join(dashboardRoot, 'scripts', 'loops', 'weekly-wyrd.js')],
    specialist: 'Lebot James',
  },
  'build-slate': {
    mode: 'quad',
    hall: 'Trading',
    kind: 'loop',
    script: ['node', path.join(dashboardRoot, 'scripts', 'loops', 'slate-selection-critic.js')],
    specialist: 'Perseus',
  },
  'design-pass': {
    mode: 'quad',
    hall: 'Lucky Dog',
    kind: 'loop',
    script: ['node', path.join(dashboardRoot, 'scripts', 'loops', 'design-critique.js')],
    specialist: 'Fenrir',
  },
  'vault-cleanup': {
    mode: 'triad',
    hall: 'AIOS',
    kind: 'llm',
    specialist: 'Lebot James',
  },
};

function selectCouncilWorker(agent, usage) {
  const deepseekOpen = deepseekAvailable(usage);
  const codexOpen = codexAvailable();

  if (agent === 'perseus') {
    if (deepseekOpen) return 'deepseek';
    if (codexOpen) return 'codex';
    return null;
  }
  if (agent === 'sauron') {
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (deepseekOpen) return 'deepseek';
    if (codexOpen) return 'codex';
    return null;
  }
  if (codexOpen) return 'codex';
  if (deepseekOpen) return 'deepseek';
  return null;
}

function nowIso() {
  return new Date().toISOString();
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function readTriadUsage() {
  return readJson(triadUsagePath, {
    generatedAt: new Date(0).toISOString(),
    deepseek: { spentUsd: 0, dailyCapUsd: deepseekHardCap, balanceUsd: 5 },
    free: { usagePercent: 0, callsToday: 0 },
    runs: [],
  });
}

function recordUsage(entry) {
  const usage = readTriadUsage();
  usage.runs = Array.isArray(usage.runs) ? usage.runs : [];
  usage.runs.unshift(entry);
  usage.runs = usage.runs.slice(0, 100);
  if (entry.provider === 'deepseek') {
    usage.deepseek.spentUsd = Number((usage.deepseek.spentUsd + (entry.costUsd || 0)).toFixed(4));
  }
  if (['cerebras', 'groq', 'gemini', 'ollama'].includes(entry.provider)) {
    usage.free.callsToday = (usage.free.callsToday || 0) + 1;
    usage.free.usagePercent = Math.min(100, usage.free.callsToday * 5);
  }
  usage.generatedAt = nowIso();
  writeJson(triadUsagePath, usage);
}

function codexAvailable() {
  return fs.existsSync(path.join(os.homedir(), '.codex', 'auth.json'));
}

function resolveClaudeBinary() {
  const explicit = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
  if (fs.existsSync(explicit)) return explicit;
  const which = spawnSync('where', ['claude'], { shell: true, encoding: 'utf8', timeout: 4000 });
  if (which.status === 0) {
    const first = which.stdout.split(/\r?\n/).find(Boolean);
    if (first) return first.trim();
  }
  return null;
}

function deepseekAvailable(usage) {
  return Boolean(process.env.DEEPSEEK_API_KEY) && usage.deepseek.spentUsd < deepseekHardCap;
}

function buildCounselScroll(action, answers, usage) {
  const config = ACTION_CONFIG[action];
  const paidWorker =
    deepseekAvailable(usage) ? 'deepseek' : codexAvailable() ? 'codex' : null;

  const pieces = [];

  if (config.kind === 'llm') {
    pieces.push({
      step: 'Worker',
      worker: paidWorker || 'cerebras',
      why: paidWorker === 'deepseek'
        ? 'bulk reasoning at low metered cost'
        : paidWorker === 'codex'
          ? 'flat-cost fallback once DeepSeek is capped or unavailable'
          : 'free fallback because paid workers are unavailable',
    });
    pieces.push({
      step: 'Final Review',
      worker: 'claude-cli',
      why: 'tone and synthesis pass in the reigning voice',
    });
  } else {
    pieces.push({
      step: 'Specialist Loop',
      worker: 'script-runner',
      why: `existing ${config.specialist} pipeline already encodes the domain workflow`,
    });
    if (config.mode === 'quad') {
      pieces.push({
        step: 'Critique Ring',
        worker: 'cerebras + groq + gemini',
        why: 'free triple critique only in quad mode',
      });
    }
  }

  return {
    action,
    mode: config.mode,
    hall: config.hall,
    answers,
    pieces,
    caps: {
      deepseekSoftCap,
      deepseekHardCap,
      deepseekSpent: usage.deepseek.spentUsd,
      codexAvailable: codexAvailable(),
    },
  };
}

async function classifyMode(action, answers) {
  const config = ACTION_CONFIG[action];
  try {
    const result = await callCerebras({
      model: MODEL_MAP.cerebrasFast,
      system: 'You are a mode classifier. Return ONLY one token: solo, triad, or quad.',
      prompt: `Action: ${action}\nDefault: ${config.mode}\nAnswers:\n${answers}\nReturn only the mode best suited to this work.`,
      maxTokens: 8,
    });
    if (result.ok) {
      recordUsage({
        ts: nowIso(),
        action,
        stage: 'thinker-classifier',
        provider: 'cerebras',
        model: MODEL_MAP.cerebrasFast,
        costUsd: 0,
      });
      const mode = result.text.trim().toLowerCase();
      if (mode === 'solo' || mode === 'triad' || mode === 'quad') return mode;
    }
  } catch {}
  return config.mode;
}

function llmSystemFor(action) {
  switch (action) {
    case 'plan-today':
      return 'You are Lebot James drafting a sharp daily plan for Lord Woody. Output crisp markdown with Focus, Open Tasks, and Standing Orders.';
    case 'process-inbox':
      return 'You are Lebot James processing inbox notes. Route tagged notes, and for any untagged note explicitly ask Woody where it belongs instead of guessing.';
    case 'vault-cleanup':
      return 'You are Lebot James summarizing vault cleanup findings. Be concise, direct, and actionable.';
    default:
      return 'You are a helpful AIOS worker.';
  }
}

function gatherPlanTodayContext() {
  const stats = readJson(aiosStatsPath, null);
  let tasks = [];
  try {
    const db = new Database(tasksDbPath, { readonly: true });
    tasks = db.prepare("SELECT title, priority, status FROM tasks WHERE status != 'done' ORDER BY priority DESC, id DESC LIMIT 5").all();
    db.close();
  } catch {}
  return { stats, tasks };
}

function gatherInboxContext() {
  const inboxDir = path.join(vault, '00 Inbox');
  if (!fs.existsSync(inboxDir)) return [];
  return fs
    .readdirSync(inboxDir)
    .filter((file) => file.endsWith('.md'))
    .slice(0, 25)
    .map((file) => {
      const fullPath = path.join(inboxDir, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      return {
        file,
        tags: Array.from(new Set(raw.match(/#[a-z0-9-]+/gi) || [])),
        excerpt: raw.replace(/\s+/g, ' ').slice(0, 180),
      };
    });
}

function gatherVaultCleanupContext() {
  const out = { duplicates: [], brokenLinks: [] };
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.obsidian') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath);
    }
  };
  walk(vault);
  const basenameMap = new Map();
  for (const file of files) {
    const base = path.basename(file).toLowerCase();
    basenameMap.set(base, [...(basenameMap.get(base) || []), file]);
    const raw = fs.readFileSync(file, 'utf8');
    const wikiLinks = raw.match(/\[\[[^\]]+\]\]/g) || [];
    for (const link of wikiLinks) {
      const target = link.slice(2, -2).split('|')[0].trim().toLowerCase();
      const matches = files.filter((candidate) => path.basename(candidate, '.md').toLowerCase() === target);
      if (matches.length === 0) out.brokenLinks.push({ file, link });
    }
  }
  out.duplicates = [...basenameMap.entries()].filter(([, list]) => list.length > 1).map(([name, list]) => ({ name, files: list }));
  return out;
}

async function callWorker(provider, { system, prompt, maxTokens = 2000 }) {
  if (provider === 'deepseek') {
    return callDeepSeek({ model: MODEL_MAP.deepseek, system, prompt, maxTokens });
  }
  if (provider === 'codex') {
    return callCodex({ model: MODEL_MAP.codex, system, prompt, maxTokens });
  }
  if (provider === 'cerebras') {
    return callCerebras({ model: MODEL_MAP.cerebrasMid, system, prompt, maxTokens });
  }
  if (provider === 'groq') {
    return callGroq({ model: MODEL_MAP.groqLlama, system, prompt, maxTokens });
  }
  if (provider === 'gemini') {
    return callGemini({ model: MODEL_MAP.gemini, system, prompt, maxTokens });
  }
  return callOllama({ model: MODEL_MAP.ollama, system, prompt, maxTokens });
}

function estimateDeepseekCost(usage) {
  if (!usage) return 0;
  const input = usage.prompt_tokens || usage.input_tokens || 0;
  const output = usage.completion_tokens || usage.output_tokens || 0;
  return Number((((input / 1_000_000) * deepseekPricing.inputPerM) + ((output / 1_000_000) * deepseekPricing.outputPerM)).toFixed(4));
}

function saveReport(action, content) {
  const reportsDir = path.join(vault, 'AIOS', 'Reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const filePath = path.join(reportsDir, `${new Date().toISOString().slice(0, 10)}-${action}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

async function runLoopScript(action, answers) {
  const config = ACTION_CONFIG[action];
  const [command, scriptPath] = config.script;
  const args = [scriptPath];
  if (answers && action === 'deep-research') {
    args.push(answers);
  }

  const result = spawnSync(command, args, {
    cwd: dashboardRoot,
    shell: false,
    encoding: 'utf8',
    env: { ...process.env, FORGE_CONTEXT: answers || '' },
    timeout: 240000,
  });

  const output = `${result.stdout || ''}${result.stderr ? `\n${result.stderr}` : ''}`.trim();
  recordUsage({
    ts: nowIso(),
    action,
    stage: 'worker',
    provider: 'script-runner',
    model: path.basename(scriptPath),
    costUsd: 0,
  });
  return {
    ok: result.status === 0 || result.status === null,
    output,
    code: result.status ?? 0,
  };
}

async function runLlmAction(action, answers, usage) {
  const paidWorker = deepseekAvailable(usage) ? 'deepseek' : codexAvailable() ? 'codex' : null;
  if (!paidWorker) {
    return {
      ok: false,
      output:
        'DeepSeek and Codex are both unavailable. Continue on Cerebras Qwen 3 235B (free — only a small step down from DeepSeek) or hold?',
      provider: 'pause',
      model: null,
    };
  }

  let prompt = answers;
  if (action === 'plan-today') {
    const ctx = gatherPlanTodayContext();
    prompt = `Answers from Woody:\n${answers}\n\nCurrent stats:\n${JSON.stringify(ctx.stats, null, 2)}\n\nOpen tasks:\n${JSON.stringify(ctx.tasks, null, 2)}\n\nWrite a concise markdown section for today's plan.`;
  } else if (action === 'process-inbox') {
    const inbox = gatherInboxContext();
    prompt = `Answers from Woody:\n${answers}\n\nInbox notes:\n${JSON.stringify(inbox, null, 2)}\n\nWrite a markdown routing report. Tagged notes can route. Untagged notes must be listed under "Needs Woody".`;
  } else if (action === 'vault-cleanup') {
    const cleanup = gatherVaultCleanupContext();
    prompt = `Answers from Woody:\n${answers}\n\nVault findings:\n${JSON.stringify(cleanup, null, 2)}\n\nWrite a concise cleanup report with top risks and next moves.`;
  }

  const result = await callWorker(paidWorker, {
    system: llmSystemFor(action),
    prompt,
    maxTokens: 2500,
  });

  if (!result.ok) {
    if (paidWorker === 'codex') {
      return {
        ok: false,
        output:
          'DeepSeek and Codex are both unavailable. Continue on Cerebras Qwen 3 235B (free — only a small step down from DeepSeek) or hold?',
        provider: 'pause',
        model: null,
      };
    }
    return {
      ok: false,
      output: result.error || 'Worker failed.',
      provider: paidWorker,
      model: MODEL_MAP[paidWorker] || null,
    };
  }

  const costUsd = paidWorker === 'deepseek' ? estimateDeepseekCost(result.usage) : 0;
  recordUsage({
    ts: nowIso(),
    action,
    stage: 'worker',
    provider: paidWorker,
    model: MODEL_MAP[paidWorker] || null,
    costUsd,
  });

  const reportPath = saveReport(action, result.text);
  return {
    ok: true,
    output: `${result.text}\n\n[Saved] ${reportPath}`,
    provider: paidWorker,
    model: MODEL_MAP[paidWorker] || null,
  };
}

async function finalReview(action, answers, workerOutput) {
  const binary = resolveClaudeBinary();
  if (!binary) return null;

  const prompt = `You are Lebot James. Consolidate the forging result into a short final review for Lord Woody.

Action: ${action}
Answers:
${answers}

Worker output:
${workerOutput}

Return 3 concise sections:
## Verdict
## Why it matters
## Next move`;

  const result = spawnSync(binary, ['-p', '--output-format', 'text', prompt], {
    cwd: dashboardRoot,
    shell: false,
    encoding: 'utf8',
    timeout: 240000,
  });
  if (result.status !== 0) return null;
  recordUsage({
    ts: nowIso(),
    action,
    stage: 'final-review',
    provider: 'claude-cli',
    model: 'claude-cli',
    costUsd: 0,
  });
  return result.stdout.trim();
}

async function runCriticRing(agent, question, answers, workerOutput) {
  const critics = [
    { provider: 'cerebras', model: MODEL_MAP.cerebrasMid, label: 'technical' },
    { provider: 'groq', model: MODEL_MAP.groqLlama, label: 'taste' },
    { provider: 'gemini', model: MODEL_MAP.gemini, label: 'intent' },
  ];

  const outputs = [];
  for (const critic of critics) {
    let result = null;
    if (critic.provider === 'cerebras') {
      result = await callCerebras({
        model: critic.model,
        system: `You are a ${critic.label} critic. Return 3 bullet concerns or 'No quarrel here.'`,
        prompt: `Question: ${question}\nAnswers: ${answers}\nDraft:\n${workerOutput}`,
        maxTokens: 500,
      });
    } else if (critic.provider === 'groq') {
      result = await callGroq({
        model: critic.model,
        system: `You are a ${critic.label} critic. Return 3 bullet concerns or 'No quarrel here.'`,
        prompt: `Question: ${question}\nAnswers: ${answers}\nDraft:\n${workerOutput}`,
        maxTokens: 500,
      });
    } else if (critic.provider === 'gemini' && process.env.GEMINI_API_KEY) {
      result = await callGemini({
        model: critic.model,
        system: `You are a ${critic.label} critic. Return 3 bullet concerns or 'No quarrel here.'`,
        prompt: `Question: ${question}\nAnswers: ${answers}\nDraft:\n${workerOutput}`,
        maxTokens: 500,
      });
    }
    if (result?.ok) {
      recordUsage({
        ts: nowIso(),
        action: 'council-deep',
        stage: `critic-${critic.label}`,
        provider: critic.provider,
        model: critic.model,
        costUsd: 0,
      });
      outputs.push(`### ${critic.label}\n${result.text}`);
    }
  }

  return outputs;
}

async function thinkerPlanCouncil({ agent, prompt, answers }) {
  const binary = resolveClaudeBinary();
  if (!binary) {
    return {
      mode: 'triad',
      plan: [
        { step: 'Worker', worker: selectCouncilWorker(agent, readTriadUsage()) || 'cerebras', why: 'fallback plan' },
      ],
      rationale: 'Claude CLI unavailable, using fallback council plan.',
    };
  }

  const planPrompt = `You are the Thinker, always Opus. Break this council question into the lightest viable plan.

Agent: ${agent}
Question: ${prompt}
Interrogator answers:
${answers}

Return strict JSON:
{
  "mode": "triad" | "quad",
  "rationale": "one short sentence",
  "plan": [
    { "step": "Worker", "worker": "deepseek|codex|gemini|cerebras", "why": "one short sentence" },
    { "step": "Critic Ring", "worker": "cerebras+groq+gemini", "why": "only if quad" }
  ]
}`;

  const result = spawnSync(binary, ['-p', '--output-format', 'text', '--model', 'claude-opus-4-7', planPrompt], {
    cwd: dashboardRoot,
    shell: false,
    encoding: 'utf8',
    timeout: 240000,
  });
  if (result.status !== 0) {
    return {
      mode: 'triad',
      rationale: 'Thinker fell back to a conservative triad.',
      plan: [{ step: 'Worker', worker: selectCouncilWorker(agent, readTriadUsage()) || 'cerebras', why: 'safe fallback' }],
    };
  }

  try {
    const match = result.stdout.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    return JSON.parse(match[0]);
  } catch {
    return {
      mode: 'triad',
      rationale: 'Thinker output could not be parsed; using conservative triad.',
      plan: [{ step: 'Worker', worker: selectCouncilWorker(agent, readTriadUsage()) || 'cerebras', why: 'safe fallback' }],
    };
  }
}

async function runCouncilTriad({ agent, prompt, answers, supercharged = false }) {
  const usage = readTriadUsage();
  const thinker = await thinkerPlanCouncil({ agent, prompt, answers });
  const forcedMode = supercharged ? 'quad' : thinker.mode;
  const selectedWorker =
    thinker.plan.find((step) => step.step === 'Worker')?.worker || selectCouncilWorker(agent, usage) || 'cerebras';

  const counsel = {
    action: 'council-deep',
    mode: forcedMode,
    hall: 'Council',
    answers,
    pieces: thinker.plan,
    rationale: thinker.rationale,
    caps: {
      deepseekSoftCap,
      deepseekHardCap,
      deepseekSpent: usage.deepseek.spentUsd,
      codexAvailable: codexAvailable(),
    },
  };

  const toolCalls = [
    {
      id: 'thinker-opus',
      name: 'Thinker (Opus)',
      status: 'success',
      params: { agent, question: prompt },
      result: counsel,
    },
  ];

  const workerResult = await callWorker(selectedWorker, {
    system: `You are ${agent}. Answer in that council persona voice with crisp structure.`,
    prompt: `Original question: ${prompt}\nInterrogator answers:\n${answers}\nRespond as ${agent}.`,
    maxTokens: 2200,
  });

  if (!workerResult.ok) {
    const message =
      selectedWorker === 'codex'
        ? 'DeepSeek and Codex are both unavailable. Continue on Cerebras Qwen 3 235B (free — only a small step down from DeepSeek) or hold?'
        : workerResult.error || 'The council could not complete the forging.';
    return {
      meta: { provider: 'triad', model: 'interrupted', costUsd: 0 },
      toolCalls,
      finalText: message,
    };
  }

  const workerCost = selectedWorker === 'deepseek' ? estimateDeepseekCost(workerResult.usage) : 0;
  recordUsage({
    ts: nowIso(),
    action: 'council-deep',
    stage: 'worker',
    provider: selectedWorker,
    model: MODEL_MAP[selectedWorker] || selectedWorker,
    costUsd: workerCost,
  });
  toolCalls.push({
    id: 'worker-primary',
    name: `Worker (${selectedWorker})`,
    status: 'success',
    params: { mode: forcedMode },
    result: typeof workerResult.text === 'string' ? workerResult.text.slice(0, 240) : 'completed',
  });

  let reviewInput = workerResult.text;
  if (forcedMode === 'quad') {
    const critics = await runCriticRing(agent, prompt, answers, workerResult.text);
    if (critics.length) {
      toolCalls.push({
        id: 'critic-ring',
        name: 'Critic Ring',
        status: 'success',
        result: critics.join('\n\n'),
      });
      reviewInput = `${workerResult.text}\n\n${critics.join('\n\n')}`;
    }
  }

  const final = await finalReview('council-deep', answers, reviewInput);
  return {
    meta: {
      provider: 'triad',
      model:
        forcedMode === 'quad'
          ? `Opus · ${MODEL_MAP[selectedWorker] || selectedWorker} · critics`
          : `Opus · ${MODEL_MAP[selectedWorker] || selectedWorker}`,
      costUsd: Number((workerCost + (forcedMode === 'quad' ? 0.02 : 0)).toFixed(2)),
    },
    toolCalls,
    finalText: final || workerResult.text,
  };
}

async function main() {
  const action = process.argv[2];
  const answers = process.argv.slice(3).join(' ').trim();
  if (!action || !ACTION_CONFIG[action]) {
    console.error('Usage: node scripts/triad/forge.js <action> "<answers>"');
    process.exit(1);
  }

  if (!answers) {
    console.error('Interrogator answers required.');
    process.exit(1);
  }

  const usage = readTriadUsage();
  const classifiedMode = await classifyMode(action, answers);
  const counsel = buildCounselScroll(action, answers, usage);
  counsel.mode = classifiedMode;

  console.log('# Counsel Scroll');
  console.log(JSON.stringify(counsel, null, 2));
  console.log('');

  let workerResult;
  if (ACTION_CONFIG[action].kind === 'loop') {
    workerResult = await runLoopScript(action, answers);
    console.log('## Worker Output');
    console.log(workerResult.output || '(no output)');
  } else {
    workerResult = await runLlmAction(action, answers, usage);
    console.log('## Worker Output');
    console.log(workerResult.output || '(no output)');
  }

  if (!workerResult.ok) {
    process.exit(0);
  }

  const review = await finalReview(action, answers, workerResult.output);
  if (review) {
    console.log('\n## Final Review');
    console.log(review);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Forge failed');
    process.exit(1);
  });
}

module.exports.runCouncilTriad = runCouncilTriad;
