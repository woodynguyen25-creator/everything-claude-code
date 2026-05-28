import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { getForgeAction, type ForgeActionSlug } from '@/lib/forge-actions';
import { appendActivityLog } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

type ActionBody = {
  answers?: string;
};

const ACTION_COMMANDS: Record<
  ForgeActionSlug,
  {
    command: string;
    args: string[];
    cwd: string;
    env?: Record<string, string>;
    formatAnswers?: (answers: string) => string[];
  }
> = {
  'morning-brief': {
    command: 'node',
    args: ['scripts/triad/forge.js', 'morning-brief'],
    cwd: process.cwd(),
    formatAnswers: (answers) => [answers],
  },
  'deep-research': {
    command: 'node',
    args: ['scripts/triad/forge.js', 'deep-research'],
    cwd: process.cwd(),
    formatAnswers: (answers) => [answers],
  },
  'plan-today': {
    command: 'node',
    args: ['scripts/triad/forge.js', 'plan-today'],
    cwd: process.cwd(),
    formatAnswers: (answers) => [answers],
  },
  'process-inbox': {
    command: 'node',
    args: ['scripts/triad/forge.js', 'process-inbox'],
    cwd: process.cwd(),
    formatAnswers: (answers) => [answers],
  },
  'weekly-review': {
    command: 'node',
    args: ['scripts/triad/forge.js', 'weekly-review'],
    cwd: process.cwd(),
    formatAnswers: (answers) => [answers],
  },
  'build-slate': {
    command: 'node',
    args: ['scripts/triad/forge.js', 'build-slate'],
    cwd: process.cwd(),
    formatAnswers: (answers) => [answers],
  },
  'design-pass': {
    command: 'node',
    args: ['scripts/triad/forge.js', 'design-pass'],
    cwd: process.cwd(),
    formatAnswers: (answers) => [answers],
  },
  'vault-cleanup': {
    command: 'node',
    args: ['scripts/triad/forge.js', 'vault-cleanup'],
    cwd: process.cwd(),
    formatAnswers: (answers) => [answers],
  },
  'refresh-metrics': {
    command: 'node',
    args: ['scripts/tools/refresh-metrics.js'],
    cwd: process.cwd(),
  },
  'run-doctor': {
    command: 'node',
    args: ['scripts/tools/run-doctor.js'],
    cwd: process.cwd(),
  },
};

export async function POST(req: Request, { params }: { params: { action: string } }) {
  const action = getForgeAction(params.action);
  if (!action) {
    return NextResponse.json({ error: 'Unknown forging action' }, { status: 404 });
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as ActionBody;
  if (action.needsInterrogator && !body.answers?.trim()) {
    return NextResponse.json({ error: 'Interrogator answers required' }, { status: 400 });
  }

  const command = ACTION_COMMANDS[action.slug];
  const args = [...command.args, ...(command.formatAnswers && body.answers ? command.formatAnswers(body.answers) : [])];
  const env = {
    ...process.env,
    ...(command.env ?? {}),
    FORGE_CONTEXT: body.answers ?? '',
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      appendActivityLog({
        timestamp: new Date().toISOString(),
        action: action.slug,
        agent: action.agent,
        status: 'started',
      });

      const child = spawn(command.command, args, {
        cwd: command.cwd,
        env,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'status', action: action.slug, label: action.label })}\n\n`)
      );
      if (body.answers?.trim()) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'interrogator', answers: body.answers.trim() })}\n\n`)
        );
      }

      child.stdout.on('data', (chunk) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', text: chunk.toString() })}\n\n`));
      });
      child.stderr.on('data', (chunk) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', text: chunk.toString() })}\n\n`));
      });
      child.on('close', (code) => {
        appendActivityLog({
          timestamp: new Date().toISOString(),
          action: action.slug,
          agent: action.agent,
          status: (code ?? 0) === 0 ? 'completed' : 'failed',
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', code: code ?? 0 })}\n\n`));
        controller.close();
      });
      child.on('error', (error) => {
        appendActivityLog({
          timestamp: new Date().toISOString(),
          action: action.slug,
          agent: action.agent,
          status: 'failed',
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`));
        controller.close();
      });
      req.signal.addEventListener(
        'abort',
        () => {
          child.kill();
        },
        { once: true }
      );
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
