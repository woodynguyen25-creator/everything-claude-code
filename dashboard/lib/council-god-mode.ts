import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import type { CouncilAgent } from '@/lib/council';
import type { ToolCall } from '@/lib/chat-schema';

const require = createRequire(import.meta.url);
const {
  MODEL_MAP,
  callCerebras,
  callDeepSeek,
  callGroq,
  callGemini,
  callCodex,
} = require('../scripts/loops/lib/router.js') as {
  MODEL_MAP: Record<string, string>;
  callCerebras: (args: { model: string; system: string; prompt: string; maxTokens?: number }) => Promise<{ ok: boolean; text: string; usage?: Record<string, number> }>;
  callDeepSeek: (args: { model: string; system: string; prompt: string; maxTokens?: number }) => Promise<{ ok: boolean; text: string; error?: string; usage?: Record<string, number> }>;
  callGroq: (args: { model: string; system: string; prompt: string; maxTokens?: number }) => Promise<{ ok: boolean; text: string; usage?: Record<string, number> }>;
  callGemini: (args: { model: string; system: string; prompt: string; maxTokens?: number }) => Promise<{ ok: boolean; text: string; usage?: Record<string, number> }>;
  callCodex: (args: { model: string; system: string; prompt: string; maxTokens?: number }) => Promise<{ ok: boolean; text: string; error?: string; usage?: Record<string, number> }>;
};

const triadUsagePath = path.join(process.cwd(), 'data', 'triad-usage.json');
const deepseekPricing = { inputPerM: 0.27, outputPerM: 1.1 };
const deepseekSoftCap = 0.5;
const deepseekHardCap = 1.5;

function nowIso() {
  return new Date().toISOString();
}

function readTriadUsage() {
  try {
    return JSON.parse(fs.readFileSync(triadUsagePath, 'utf8')) as {
      generatedAt: string;
      deepseek: { spentUsd: number; dailyCapUsd: number; balanceUsd: number };
      free: { usagePercent: number; callsToday?: number };
      runs?: Array<Record<string, unknown>>;
    };
  } catch {
    return {
      generatedAt: new Date(0).toISOString(),
      deepseek: { spentUsd: 0, dailyCapUsd: deepseekHardCap, balanceUsd: 5 },
      free: { usagePercent: 0, callsToday: 0 },
      runs: [],
    };
  }
}

function writeTriadUsage(value: ReturnType<typeof readTriadUsage>) {
  fs.mkdirSync(path.dirname(triadUsagePath), { recursive: true });
  fs.writeFileSync(triadUsagePath, JSON.stringify(value, null, 2), 'utf8');
}

function recordUsage(entry: Record<string, unknown>) {
  const usage = readTriadUsage();
  usage.runs = Array.isArray(usage.runs) ? usage.runs : [];
  usage.runs.unshift(entry);
  usage.runs = usage.runs.slice(0, 100);
  if (entry.provider === 'deepseek') {
    usage.deepseek.spentUsd = Number((usage.deepseek.spentUsd + (Number(entry.costUsd) || 0)).toFixed(4));
  }
  if (['cerebras', 'groq', 'gemini'].includes(String(entry.provider))) {
    usage.free.callsToday = (usage.free.callsToday || 0) + 1;
    usage.free.usagePercent = Math.min(100, (usage.free.callsToday || 0) * 5);
  }
  usage.generatedAt = nowIso();
  writeTriadUsage(usage);
}

function resolveClaudeBinary() {
  const explicit = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
  if (fs.existsSync(explicit)) return explicit;
  const result = spawnSync('where', ['claude'], { shell: true, encoding: 'utf8', timeout: 4000 });
  if (result.status === 0) {
    const first = result.stdout.split(/\r?\n/).find(Boolean);
    if (first) return first.trim();
  }
  return null;
}

function codexAvailable() {
  return fs.existsSync(path.join(os.homedir(), '.codex', 'auth.json'));
}

function deepseekAvailable(usage: ReturnType<typeof readTriadUsage>) {
  return Boolean(process.env.DEEPSEEK_API_KEY) && usage.deepseek.spentUsd < deepseekHardCap;
}

function estimateDeepseekCost(usage?: Record<string, number>) {
  if (!usage) return 0;
  const input = usage.prompt_tokens || usage.input_tokens || 0;
  const output = usage.completion_tokens || usage.output_tokens || 0;
  return Number((((input / 1_000_000) * deepseekPricing.inputPerM) + ((output / 1_000_000) * deepseekPricing.outputPerM)).toFixed(4));
}

function selectWorker(agent: CouncilAgent, usage: ReturnType<typeof readTriadUsage>) {
  const deepseekOpen = deepseekAvailable(usage);
  const codexOpen = codexAvailable();

  if (agent === 'perseus') {
    if (deepseekOpen) return 'deepseek';
    if (codexOpen) return 'codex';
    return null;
  }
  if (agent === 'sauron') {
    // gemini REMOVED 2026-08-21: the free-tier API key is the trains-on-input
    // path the council benched, and God Mode prompts carry the same personal
    // content. Deepseek/codex carry Sauron until billing is attached.
    if (deepseekOpen) return 'deepseek';
    if (codexOpen) return 'codex';
    return null;
  }
  if (codexOpen) return 'codex';
  if (deepseekOpen) return 'deepseek';
  return null;
}

function thinkerPlanFallback(agent: CouncilAgent, usage: ReturnType<typeof readTriadUsage>) {
  return {
    mode: 'triad',
    rationale: 'Thinker fell back to a conservative triad.',
    plan: [
      {
        step: 'Worker',
        worker: selectWorker(agent, usage) || 'cerebras',
        why: 'safe fallback',
      },
    ],
  };
}

async function thinkerPlanCouncil(agent: CouncilAgent, prompt: string, answers: string) {
  const binary = resolveClaudeBinary();
  const usage = readTriadUsage();
  if (!binary) return thinkerPlanFallback(agent, usage);

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
    { "step": "Worker", "worker": "deepseek|codex|cerebras", "why": "one short sentence" },
    { "step": "Critic Ring", "worker": "cerebras+groq", "why": "only if quad" }
  ]
}`;

  const result = spawnSync(binary, ['-p', '--output-format', 'text', '--model', 'claude-opus-4-7', planPrompt], {
    cwd: process.cwd(),
    shell: false,
    encoding: 'utf8',
    timeout: 240000,
  });

  if (result.status !== 0 || !result.stdout.trim()) return thinkerPlanFallback(agent, usage);
  try {
    const match = result.stdout.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    return JSON.parse(match[0]) as {
      mode: 'triad' | 'quad';
      rationale: string;
      plan: Array<{ step: string; worker: string; why: string }>;
    };
  } catch {
    return thinkerPlanFallback(agent, usage);
  }
}

async function callWorker(provider: string, prompt: string) {
  if (provider === 'deepseek') {
    return callDeepSeek({ model: MODEL_MAP.deepseek, system: 'Answer in the council persona voice.', prompt, maxTokens: 2200 });
  }
  if (provider === 'codex') {
    return callCodex({ model: MODEL_MAP.codex, system: 'Answer in the council persona voice.', prompt, maxTokens: 2200 });
  }
  if (provider === 'gemini') {
    return callGemini({ model: MODEL_MAP.gemini, system: 'Answer in the council persona voice.', prompt, maxTokens: 2200 });
  }
  return callCerebras({ model: MODEL_MAP.cerebrasMid, system: 'Answer in the council persona voice.', prompt, maxTokens: 2200 });
}

async function runCriticRing(prompt: string, answers: string, workerOutput: string) {
  const critics = [];

  const technical = await callCerebras({
    model: MODEL_MAP.cerebrasMid,
    system: 'You are a technical critic. Return 3 bullets or "No quarrel here."',
    prompt: `Question: ${prompt}\nAnswers: ${answers}\nDraft:\n${workerOutput}`,
    maxTokens: 500,
  });
  if (technical.ok) critics.push(`### technical\n${technical.text}`);

  const taste = await callGroq({
    model: MODEL_MAP.groqLlama,
    system: 'You are a taste and strategy critic. Return 3 bullets or "No quarrel here."',
    prompt: `Question: ${prompt}\nAnswers: ${answers}\nDraft:\n${workerOutput}`,
    maxTokens: 500,
  });
  if (taste.ok) critics.push(`### taste\n${taste.text}`);

  // Third (user-intent) critic REMOVED 2026-08-21 with the free-tier gemini path
  // (trains-on-input). Two critics remain; restore a third from a verified-private
  // provider if the ring needs the extra lens.

  return critics;
}

function finalReview(agent: CouncilAgent, answers: string, workerOutput: string) {
  const binary = resolveClaudeBinary();
  if (!binary) return workerOutput;

  const prompt = `You are ${agent}. Consolidate this council forging into a final answer for Lord Woody.

Interrogator answers:
${answers}

Working draft:
${workerOutput}

Respond in the council's voice.`;

  const result = spawnSync(binary, ['-p', '--output-format', 'text', '--model', 'claude-opus-4-7', prompt], {
    cwd: process.cwd(),
    shell: false,
    encoding: 'utf8',
    timeout: 240000,
  });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : workerOutput;
}

export async function runCouncilGodMode(input: {
  agent: CouncilAgent;
  prompt: string;
  answers: string;
}) {
  const usage = readTriadUsage();
  const thinker = await thinkerPlanCouncil(input.agent, input.prompt, input.answers);
  const selectedWorker = thinker.plan.find((step) => step.step === 'Worker')?.worker || selectWorker(input.agent, usage) || 'cerebras';

  const toolCalls: ToolCall[] = [
    {
      id: 'thinker-opus',
      name: 'Thinker (Opus)',
      status: 'success',
      params: { agent: input.agent, question: input.prompt },
      result: {
        mode: thinker.mode,
        rationale: thinker.rationale,
        plan: thinker.plan,
        caps: {
          deepseekSoftCap,
          deepseekHardCap,
          deepseekSpent: usage.deepseek.spentUsd,
          codexAvailable: codexAvailable(),
        },
      },
    },
  ];

  const workerPrompt = `Original question: ${input.prompt}\nInterrogator answers:\n${input.answers}\nRespond as ${input.agent}.`;
  const worker = (await callWorker(selectedWorker, workerPrompt)) as {
    ok: boolean;
    text: string;
    usage?: Record<string, number>;
    error?: string;
  };

  if (!worker.ok) {
    return {
      meta: {
        provider: 'triad',
        model: 'interrupted',
        costUsd: 0,
      },
      toolCalls,
      finalText:
        selectedWorker === 'codex'
          ? 'DeepSeek and Codex are both unavailable. Continue on Cerebras Qwen 3 235B (free — only a small step down from DeepSeek) or hold?'
          : worker.error || 'The council could not complete the forging.',
    };
  }

  const workerCost = selectedWorker === 'deepseek' ? estimateDeepseekCost(worker.usage) : 0;
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
    params: { mode: thinker.mode },
    result: typeof worker.text === 'string' ? worker.text.slice(0, 240) : 'completed',
  });

  let synthesisSource = worker.text;
  if (thinker.mode === 'quad') {
    const critics = await runCriticRing(input.prompt, input.answers, worker.text);
    if (critics.length) {
      toolCalls.push({
        id: 'critic-ring',
        name: 'Critic Ring',
        status: 'success',
        result: critics.join('\n\n'),
      });
      synthesisSource = `${worker.text}\n\n${critics.join('\n\n')}`;
    }
  }

  recordUsage({
    ts: nowIso(),
    action: 'council-deep',
    stage: 'final-review',
    provider: 'claude-cli',
    model: 'claude-opus-4-7',
    costUsd: 0,
  });

  return {
    meta: {
      provider: 'triad',
      model: thinker.mode === 'quad'
        ? `Opus · ${MODEL_MAP[selectedWorker] || selectedWorker} · critics`
        : `Opus · ${MODEL_MAP[selectedWorker] || selectedWorker}`,
      costUsd: Number(workerCost.toFixed(2)),
    },
    toolCalls,
    finalText: finalReview(input.agent, input.answers, synthesisSource),
  };
}
