'use client';

import { cva } from 'class-variance-authority';
import type { ToolCall } from '@/lib/chat-schema';

const statusTone = cva(
  'inline-flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.22em]',
  {
    variants: {
      status: {
        pending: 'bg-bg-hover text-text-muted',
        running: 'bg-bifrost/10 text-bifrost',
        success: 'bg-emerald/10 text-emerald',
        error: 'bg-blood/10 text-blood',
      },
    },
    defaultVariants: {
      status: 'pending',
    },
  }
);

const runeForStatus: Record<ToolCall['status'], string> = {
  pending: 'ᚱ',
  running: 'ᛏ',
  success: 'ᛞ',
  error: 'ᛪ',
};

type Props = {
  toolCall: ToolCall;
  accentBorderClass: string;
};

export default function ToolCallCard({ toolCall, accentBorderClass }: Props) {
  return (
    <article
      aria-labelledby={`tool-${toolCall.id}`}
      className={`panel mt-3 border-l-4 ${accentBorderClass} p-4`}
    >
      <div className="flex items-center justify-between gap-3">
        <div id={`tool-${toolCall.id}`} className="font-mono text-xs text-rune-gold">
          🔧 {toolCall.name}
        </div>
        <div className={statusTone({ status: toolCall.status })}>
          <span>{runeForStatus[toolCall.status]}</span>
          <span>{toolCall.status === 'running' ? 'Consulting' : toolCall.status}</span>
          {toolCall.durationMs ? (
            <span className="font-numeric normal-case tracking-normal text-text-muted">
              {(toolCall.durationMs / 1000).toFixed(1)}s
            </span>
          ) : null}
        </div>
      </div>

      {toolCall.result ? (
        <div className="mt-3 rounded bg-bg-deep p-3 text-xs text-text-secondary">
          <pre className="whitespace-pre-wrap font-mono">
            {typeof toolCall.result === 'string'
              ? toolCall.result
              : JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </div>
      ) : null}

      {toolCall.params ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-text-muted">Show parameters</summary>
          <pre className="mt-2 overflow-x-auto rounded bg-bg-deep p-3 text-xs text-text-secondary">
            {JSON.stringify(toolCall.params, null, 2)}
          </pre>
        </details>
      ) : null}

      {toolCall.error ? <div className="mt-3 text-xs text-blood">{toolCall.error}</div> : null}
    </article>
  );
}
