import { NextResponse } from 'next/server';
import { createMessage, createThread, getThread, listMessages } from '@/lib/chat';
import { streamCouncilResponse } from '@/lib/chat-stream';
import { chatRequestSchema } from '@/lib/chat-schema';
import { isCouncilAgent } from '@/lib/council';
import { runCouncilGodMode } from '@/lib/council-god-mode';
import { getCouncilGodModeLabel } from '@/lib/council-models';
import { clearPendingGodMode, getPendingGodMode, setPendingGodMode } from '@/lib/god-mode-state';
import { readPersonaSystemPrompt } from '@/lib/personas';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

export const dynamic = 'force-dynamic';

type Ctx = { params: { agent: string } };

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

function generateInterrogatorQuestions(agent: string, prompt: string) {
  const binary = resolveClaudeBinary();
  const label = getCouncilGodModeLabel(agent as never);
  if (!binary) {
    return `## ${label}\n\n- What outcome matters most here?\n- What constraints must this answer respect?\n- What would make this response genuinely useful, my Lord?\n\nReply with your answers, then summon again.`;
  }

  const interrogationPrompt = `You are the Interrogator for ${agent}. Ask Lord Woody the clarifying questions you truly need before a deep multi-model council response.

Question:
${prompt}

Return concise markdown:
- 3 to 6 bullet questions
- direct, specific, and high-yield
- end with one short line telling him to answer and summon again.`;

  const result = spawnSync(binary, ['-p', '--output-format', 'text', '--model', 'claude-sonnet-4-6', interrogationPrompt], {
    cwd: process.cwd(),
    shell: false,
    encoding: 'utf8',
    timeout: 240000,
  });

  if (result.status === 0 && result.stdout.trim()) {
    return `## ${label}\n\n${result.stdout.trim()}`;
  }

  return `## ${label}\n\n- What outcome matters most here?\n- What constraints must this answer respect?\n- What would make this response genuinely useful, my Lord?\n\nReply with your answers, then summon again.`;
}

export async function POST(req: Request, { params }: Ctx) {
  if (!isCouncilAgent(params.agent)) {
    return NextResponse.json({ error: 'Unknown council' }, { status: 404 });
  }
  const agent = params.agent;

  try {
    const parsed = chatRequestSchema.parse(await req.json());
    const thread =
      parsed.threadId && getThread(parsed.threadId)?.agent === agent
        ? getThread(parsed.threadId)
        : createThread(agent);

    if (!thread) {
      return NextResponse.json({ error: 'Unable to create thread' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const system = await readPersonaSystemPrompt(agent);

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        let lastMeta: { provider: string; model: string; costUsd: number } | null = null;
        let toolCalls: import('@/lib/chat-schema').ToolCall[] | null = null;

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thread', threadId: thread.id })}\n\n`));

        try {
          if (parsed.godMode) {
            const pending = getPendingGodMode(thread.id);

            if (!pending) {
              createMessage({
                threadId: thread.id,
                role: 'user',
                content: parsed.text,
              });
              const questions = generateInterrogatorQuestions(agent, parsed.text);
              setPendingGodMode({
                threadId: thread.id,
                agent,
                prompt: parsed.text,
                questions,
                createdAt: new Date().toISOString(),
              });

              createMessage({
                threadId: thread.id,
                role: 'assistant',
                content: questions,
                costUsd: 0,
                llmProvider: 'interrogator',
                llmModel: 'claude-sonnet-4-6',
              });

              const meta = { provider: 'god-mode', model: 'interrogator', costUsd: 0 };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', meta })}\n\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', fullText: questions, meta, toolCalls: null })}\n\n`));
              return;
            }

            createMessage({
              threadId: thread.id,
              role: 'user',
              content: parsed.text,
            });
            clearPendingGodMode(thread.id);

            const triad = await runCouncilGodMode({
              agent,
              prompt: pending.prompt,
              answers: parsed.text,
            });

            lastMeta = triad.meta;
            toolCalls = triad.toolCalls;
            fullText = triad.finalText;

            createMessage({
              threadId: thread.id,
              role: 'assistant',
              content: fullText,
              toolCalls,
              costUsd: triad.meta.costUsd,
              llmProvider: triad.meta.provider,
              llmModel: triad.meta.model,
            });

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', meta: triad.meta })}\n\n`));
            for (const toolCall of toolCalls ?? []) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool', toolCall })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', fullText, meta: triad.meta, toolCalls })}\n\n`));
            return;
          }

          createMessage({
            threadId: thread.id,
            role: 'user',
            content: parsed.text,
          });

          for await (const event of streamCouncilResponse({
            agent,
            prompt: parsed.text,
            system,
            threadId: thread.id,
            requestSignal: req.signal,
          })) {
            if (event.type === 'meta') {
              lastMeta = event.meta;
            }
            if (event.type === 'token') {
              fullText += event.token;
            }
            if (event.type === 'tool') {
              toolCalls = [...(toolCalls ?? []), event.toolCall];
            }
            if (event.type === 'done') {
              fullText = event.fullText;
              lastMeta = event.meta;
              toolCalls = event.toolCalls;
              createMessage({
                threadId: thread.id,
                role: 'assistant',
                content: fullText,
                toolCalls,
                costUsd: event.meta.costUsd,
                llmProvider: event.meta.provider,
                llmModel: event.meta.model,
              });
            }
            if (event.type === 'error') {
              createMessage({
                threadId: thread.id,
                role: 'system',
                content: `The Ravens faltered: ${event.error}`,
              });
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        } catch (error) {
          if (fullText.trim()) {
            createMessage({
              threadId: thread.id,
              role: 'assistant',
              content: fullText.trim(),
              toolCalls,
              costUsd: lastMeta?.costUsd ?? 0,
              llmProvider: lastMeta?.provider ?? null,
              llmModel: lastMeta?.model ?? null,
            });
          }
          createMessage({
            threadId: thread.id,
            role: 'system',
            content: 'Stream halted by Lord Woody',
          });
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Stream failed',
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Chat failed' }, { status: 400 });
  }
}
