'use client';

import { cva } from 'class-variance-authority';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { ChatMessageRecord } from '@/lib/chat-schema';
import ToolCallCard from '@/components/chat/ToolCallCard';
import StreamingCursor from '@/components/chat/StreamingCursor';

const bubbleVariants = cva('rounded px-4 py-3 shadow-panel transition-colors', {
  variants: {
    role: {
      user: 'ml-auto max-w-[70%] border-l-4 border-l-rune-gold bg-bg-deep text-text-primary',
      assistant: 'max-w-[85%] border-l-4 bg-bg-panel',
      system: 'mx-auto max-w-[60%] bg-transparent text-center text-xs italic text-text-muted shadow-none',
      tool: 'max-w-[85%] bg-transparent p-0 shadow-none',
    },
    accent: {
      gold: 'border-l-rune-gold',
      bifrost: 'border-l-bifrost',
      emerald: 'border-l-emerald',
      blood: 'border-l-blood',
      fire: 'border-l-fire',
      none: '',
    },
  },
  defaultVariants: {
    role: 'assistant',
    accent: 'gold',
  },
});

type Props = {
  message: ChatMessageRecord;
  accentTextClass: string;
  accentBorderClass: string;
  agentSymbol: string;
  agentCodename: string;
  isStreaming?: boolean;
  streamingText?: string;
};

function formatStamp(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

const markdownComponents: Components = {
  code(props) {
    const { children, className, ...rest } = props;
    const text = String(children).replace(/\n$/, '');
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded bg-bg-deep px-1 py-0.5 font-mono text-rune-gold" {...rest}>
          {children}
        </code>
      );
    }

    return (
      <div className="my-4 overflow-hidden rounded border border-border-subtle bg-bg-deep">
        <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">{className.replace('language-', '')}</span>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(text)}
            className="rounded border border-border-subtle px-2 py-1 text-[10px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            Copy
          </button>
        </div>
        <pre className="overflow-x-auto p-4">
          <code className={`${className} font-mono text-sm text-text-secondary`} {...rest}>
            {text}
          </code>
        </pre>
      </div>
    );
  },
};

export default function ChatMessage({
  message,
  accentTextClass,
  accentBorderClass,
  agentSymbol,
  agentCodename,
  isStreaming = false,
  streamingText,
}: Props) {
  if (message.role === 'system') {
    return <div className={bubbleVariants({ role: 'system' })}>{message.content}</div>;
  }

  if (message.role === 'tool') {
    return (
      <div className={bubbleVariants({ role: 'tool' })}>
        {message.toolCalls?.map((toolCall) => (
          <ToolCallCard key={toolCall.id} toolCall={toolCall} accentBorderClass={accentBorderClass} />
        ))}
      </div>
    );
  }

  return (
    <div className={bubbleVariants({ role: message.role, accent: message.role === 'assistant' ? 'none' : 'gold' })}>
      {message.role === 'assistant' ? (
        <div className={`mb-3 text-rune text-[10px] tracking-[0.28em] ${accentTextClass}`}>
          {agentSymbol} {agentCodename}
        </div>
      ) : null}

      {message.toolCalls?.length ? (
        <div className="mb-3 space-y-3">
          {message.toolCalls.map((toolCall) => (
            <ToolCallCard key={toolCall.id} toolCall={toolCall} accentBorderClass={accentBorderClass} />
          ))}
        </div>
      ) : null}

      {message.role === 'assistant' ? (
        <div className={`border-l-4 pl-4 ${accentBorderClass}`}>
          <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:text-text-primary prose-p:text-text-secondary prose-code:font-mono prose-code:text-rune-gold prose-pre:bg-bg-deep">
            <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
              {streamingText ?? message.content}
            </ReactMarkdown>
            {isStreaming ? <StreamingCursor /> : null}
          </div>
        </div>
      ) : (
        <div className="text-sm leading-7">{message.content}</div>
      )}

      <div className="mt-3 font-numeric text-[10px] text-text-muted">
        {message.role === 'assistant' && message.llmProvider
          ? `via ${message.llmProvider} ${message.llmModel ?? ''} · ${formatStamp(message.createdAt)}`
          : formatStamp(message.createdAt)}
      </div>
    </div>
  );
}
