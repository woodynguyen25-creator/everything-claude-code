import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { getCouncilConfig, type CouncilAgent, getCouncilCost } from '@/lib/council';
import type { ToolCall } from '@/lib/chat-schema';

const require = createRequire(import.meta.url);
const routerLib = require('../scripts/loops/lib/router.js') as {
  MODEL_MAP: Record<string, string>;
};

type ProviderKey = 'claude-cli' | 'codex-cli' | 'cerebras' | 'groq' | 'gemini' | 'ollama' | 'deepseek';

type ProviderMeta = {
  provider: string;
  model: string;
  costUsd: number;
};

export type StreamEvent =
  | { type: 'meta'; meta: ProviderMeta }
  | { type: 'token'; token: string }
  | { type: 'tool'; toolCall: ToolCall }
  | { type: 'done'; fullText: string; meta: ProviderMeta; toolCalls: ToolCall[] | null }
  | { type: 'error'; error: string };

const activeControllers = new Map<number, AbortController>();

const providerOrderByAgent: Record<CouncilAgent, ProviderKey[]> = {
  'lebot-james': ['claude-cli', 'cerebras', 'gemini'],
  thor: ['claude-cli', 'cerebras', 'groq', 'gemini'],
  perseus: ['deepseek', 'cerebras', 'groq', 'gemini', 'ollama'],
  fenrir: ['codex-cli', 'claude-cli', 'cerebras', 'groq', 'gemini'],
  sauron: ['gemini', 'cerebras', 'groq', 'ollama'],
};

const providerModelMap: Record<CouncilAgent, Partial<Record<ProviderKey, string>>> = {
  'lebot-james': {
    'claude-cli': 'claude-fable-5',
    cerebras: routerLib.MODEL_MAP.cerebras,
    gemini: routerLib.MODEL_MAP.gemini,
  },
  thor: {
    'claude-cli': 'claude-sonnet-4-6',
    cerebras: routerLib.MODEL_MAP.cerebras,
    groq: routerLib.MODEL_MAP.groqLlama,
    gemini: routerLib.MODEL_MAP.gemini,
  },
  perseus: {
    deepseek: routerLib.MODEL_MAP.deepseek,
    cerebras: routerLib.MODEL_MAP.cerebras,
    groq: routerLib.MODEL_MAP.groq,
    gemini: routerLib.MODEL_MAP.gemini,
    ollama: routerLib.MODEL_MAP.ollama,
  },
  fenrir: {
    'codex-cli': 'gpt-5.5',
    'claude-cli': 'claude-sonnet-4-6',
    cerebras: routerLib.MODEL_MAP.cerebras,
    groq: routerLib.MODEL_MAP.groqLlama,
    gemini: routerLib.MODEL_MAP.gemini,
  },
  sauron: {
    cerebras: routerLib.MODEL_MAP.cerebras,
    groq: routerLib.MODEL_MAP.groq,
    gemini: routerLib.MODEL_MAP.gemini,
    ollama: routerLib.MODEL_MAP.ollama,
  },
};

function resolveClaudeBinary() {
  const explicit = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
  if (fs.existsSync(explicit)) return explicit;

  const result = spawnSync('where', ['claude'], {
    shell: true,
    encoding: 'utf8',
    timeout: 3000,
  });
  if (result.status === 0) {
    const first = result.stdout.split(/\r?\n/).find(Boolean);
    if (first) return first.trim();
  }
  return null;
}

function resolveCodexBinary() {
  const result = spawnSync('where', ['codex'], {
    shell: true,
    encoding: 'utf8',
    timeout: 3000,
  });
  if (result.status === 0) {
    const lines = result.stdout.split(/\r?\n/).filter(Boolean);
    // `where` lists the extensionless bash shim first; cmd.exe can only run the .cmd one.
    const cmdShim = lines.find(l => l.trim().toLowerCase().endsWith('.cmd'));
    const first = cmdShim || lines[0];
    if (first) return first.trim();
  }
  return null;
}

function providerAvailable(provider: ProviderKey) {
  switch (provider) {
    case 'claude-cli':
      return Boolean(resolveClaudeBinary());
    case 'codex-cli':
      return Boolean(resolveCodexBinary());
    case 'cerebras':
      return Boolean(process.env.CEREBRAS_API_KEY);
    case 'groq':
      return Boolean(process.env.GROQ_API_KEY);
    case 'gemini':
      return Boolean(process.env.GEMINI_API_KEY);
    case 'deepseek':
      return Boolean(process.env.DEEPSEEK_API_KEY);
    case 'ollama':
      return true;
    default:
      return false;
  }
}

async function* streamOpenAiCompatible(args: {
  url: string;
  key: string;
  model: string;
  system: string;
  prompt: string;
  signal: AbortSignal;
}): AsyncGenerator<string> {
  const res = await fetch(args.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${args.key}`,
    },
    body: JSON.stringify({
      model: args.model,
      stream: true,
      messages: [
        ...(args.system ? [{ role: 'system', content: args.system }] : []),
        { role: 'user', content: args.prompt },
      ],
    }),
    signal: args.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`${args.url} ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part
        .split('\n')
        .find((candidate) => candidate.startsWith('data: '))
        ?.slice(6)
        .trim();
      if (!line || line === '[DONE]') continue;
      const payload = JSON.parse(line) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const token = payload.choices?.[0]?.delta?.content;
      if (token) yield token;
    }
  }
}

async function* streamGemini(args: {
  model: string;
  system: string;
  prompt: string;
  signal: AbortSignal;
}): AsyncGenerator<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('gemini unavailable');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: args.system ? { parts: [{ text: args.system }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
      }),
      signal: args.signal,
    }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  for (const word of text.split(/(\s+)/).filter(Boolean)) {
    yield word;
  }
}

async function* streamOllama(args: {
  model: string;
  system: string;
  prompt: string;
  signal: AbortSignal;
}): AsyncGenerator<string> {
  const res = await fetch(`${process.env.OLLAMA_HOST || 'http://localhost:11434'}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: args.model,
      prompt: args.prompt,
      system: args.system,
      stream: true,
    }),
    signal: args.signal,
  });
  if (!res.ok || !res.body) throw new Error(`ollama ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const payload = JSON.parse(line) as { response?: string };
      if (payload.response) yield payload.response;
    }
  }
}

async function* streamClaudeCli(args: {
  model: string;
  system: string;
  prompt: string;
  signal: AbortSignal;
}): AsyncGenerator<string> {
  const binary = resolveClaudeBinary();
  if (!binary) throw new Error('claude cli unavailable');

  const child = spawn(
    binary,
    ['-p', '--output-format', 'text', '--model', args.model, '--append-system-prompt', args.system, args.prompt],
    {
      cwd: process.cwd(),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  args.signal.addEventListener(
    'abort',
    () => {
      child.kill();
    },
    { once: true }
  );

  const queue: string[] = [];
  let done = false;
  let errorText = '';

  child.stdout.on('data', (chunk) => {
    queue.push(chunk.toString());
  });
  child.stderr.on('data', (chunk) => {
    errorText += chunk.toString();
  });
  child.on('close', () => {
    done = true;
  });

  while (!done || queue.length > 0) {
    if (queue.length > 0) {
      yield queue.shift() ?? '';
      continue;
    }
    if (args.signal.aborted) {
      throw new Error('aborted');
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  if (errorText.trim() && !args.signal.aborted) {
    throw new Error(errorText.trim());
  }
}

async function runCodexCli(args: {
  model: string;
  system: string;
  prompt: string;
  signal: AbortSignal;
}): Promise<string | null> {
  const binary = resolveCodexBinary();
  if (!binary) return null;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cli-'));
  const outputFile = path.join(tempDir, 'last-message.txt');
  const compositePrompt = args.system ? `${args.system}\n\n${args.prompt}` : args.prompt;
  // Prompt flows via stdin ('-'), never argv: shell:true (needed for the .cmd
  // shim on Windows) would otherwise let quotes/&/| in chat input break out of
  // the command line — command injection from the chat box.
  const child = spawn(
    binary,
    [
      'exec',
      '--skip-git-repo-check',
      '--color',
      'never',
      '--output-last-message',
      outputFile,
      '--model',
      args.model,
      '-',
    ],
    {
      cwd: process.cwd(),
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );
  child.stdin.write(compositePrompt);
  child.stdin.end();

  args.signal.addEventListener(
    'abort',
    () => {
      child.kill();
    },
    { once: true }
  );

  let stdout = '';
  let stderr = '';
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, 180_000);

  try {
    try {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      await new Promise<void>((resolve, reject) => {
        child.on('error', reject);
        child.on('close', () => resolve());
      });
    } finally {
      clearTimeout(timeout);
    }

    if (args.signal.aborted) {
      throw new Error('aborted');
    }
    if (timedOut) {
      return null;
    }

    try {
      const text = fs.readFileSync(outputFile, 'utf8').trim();
      if (text) return text;
    } catch {
      // Fall back to stdout parsing if the local CLI does not write the output file.
    }

    const fallbackText = stdout.trim();
    if (fallbackText) return fallbackText;
    if (stderr.trim()) return null;
    return null;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function* streamCodexCli(args: {
  model: string;
  system: string;
  prompt: string;
  signal: AbortSignal;
}): AsyncGenerator<string> {
  const text = await runCodexCli(args);
  if (!text) throw new Error('codex cli failed');

  for (const word of text.split(/(\s+)/).filter(Boolean)) {
    yield word;
  }
}

function extractToolCalls(text: string): ToolCall[] | null {
  const toolBlock = text.match(/```tool(?:call)?\s*([\s\S]*?)```/i) || text.match(/<tool_call>([\s\S]*?)<\/tool_call>/i);
  if (!toolBlock) return null;
  try {
    const parsed = JSON.parse(toolBlock[1].trim()) as
      | { name?: string; params?: Record<string, unknown> }
      | Array<{ name?: string; params?: Record<string, unknown> }>;
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const toolCalls = list
      .filter((item) => item.name)
      .map((item, index) => ({
        id: `tool-${index + 1}`,
        name: item.name as string,
        status: 'success' as const,
        params: item.params ?? {},
      }));
    return toolCalls.length ? toolCalls : null;
  } catch {
    return null;
  }
}

function metaFor(agent: CouncilAgent, provider: ProviderKey, text: string): ProviderMeta {
  const model = providerModelMap[agent][provider] ?? provider;
  return {
    provider,
    model,
    costUsd: getCouncilCost(agent, text),
  };
}

export function abortCouncilStream(threadId: number) {
  const controller = activeControllers.get(threadId);
  if (controller) {
    controller.abort();
    activeControllers.delete(threadId);
    return true;
  }
  return false;
}

export async function* streamCouncilResponse(input: {
  agent: CouncilAgent;
  prompt: string;
  system: string;
  threadId: number;
  requestSignal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  const config = getCouncilConfig(input.agent);
  const controller = new AbortController();
  const signal = controller.signal;
  activeControllers.set(input.threadId, controller);

  input.requestSignal?.addEventListener(
    'abort',
    () => {
      controller.abort();
    },
    { once: true }
  );

  try {
    const chain = providerOrderByAgent[input.agent];
    let lastError = 'No provider available';

    for (const provider of chain) {
      if (!providerAvailable(provider)) continue;
      const meta = metaFor(input.agent, provider, input.prompt);
      yield { type: 'meta', meta };

      try {
        let fullText = '';
        const tokenSource =
          provider === 'claude-cli'
            ? streamClaudeCli({
                model: meta.model,
                system: input.system,
                prompt: input.prompt,
                signal,
              })
            : provider === 'codex-cli'
              ? streamCodexCli({
                  model: meta.model,
                  system: input.system,
                  prompt: input.prompt,
                  signal,
                })
            : provider === 'deepseek'
              ? streamOpenAiCompatible({
                  url: 'https://api.deepseek.com/v1/chat/completions',
                  key: process.env.DEEPSEEK_API_KEY || '',
                  model: meta.model,
                  system: input.system,
                  prompt: input.prompt,
                  signal,
                })
            : provider === 'cerebras'
              ? streamOpenAiCompatible({
                  url: 'https://api.cerebras.ai/v1/chat/completions',
                  key: process.env.CEREBRAS_API_KEY || '',
                  model: meta.model,
                  system: input.system,
                  prompt: input.prompt,
                  signal,
                })
              : provider === 'groq'
                ? streamOpenAiCompatible({
                    url: 'https://api.groq.com/openai/v1/chat/completions',
                    key: process.env.GROQ_API_KEY || '',
                    model: meta.model,
                    system: input.system,
                    prompt: input.prompt,
                    signal,
                  })
                : provider === 'gemini'
                  ? streamGemini({
                      model: meta.model,
                      system: input.system,
                      prompt: input.prompt,
                      signal,
                    })
                  : streamOllama({
                      model: meta.model,
                      system: input.system,
                      prompt: input.prompt,
                      signal,
                    });

        for await (const token of tokenSource) {
          if (signal.aborted) throw new Error('aborted');
          fullText += token;
          yield { type: 'token', token };
        }

        const toolCalls = extractToolCalls(fullText);
        if (toolCalls) {
          for (const toolCall of toolCalls) {
            yield { type: 'tool', toolCall };
          }
        }

        yield { type: 'done', fullText: fullText.trim(), meta, toolCalls };
        return;
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        lastError = error instanceof Error ? error.message : 'stream failed';
      }
    }

    yield { type: 'error', error: lastError };
  } finally {
    activeControllers.delete(input.threadId);
  }
}
