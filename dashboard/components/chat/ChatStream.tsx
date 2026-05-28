'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessageRecord } from '@/lib/chat-schema';
import ChatMessage from '@/components/chat/ChatMessage';

type Props = {
  messages: ChatMessageRecord[];
  accentTextClass: string;
  accentBorderClass: string;
  agentSymbol: string;
  agentCodename: string;
  isStreaming: boolean;
  streamingText: string;
  thinkingLabel: string;
};

export default function ChatStream({
  messages,
  accentTextClass,
  accentBorderClass,
  agentSymbol,
  agentCodename,
  isStreaming,
  streamingText,
  thinkingLabel,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showJump, setShowJump] = useState(false);

  function snapToBottom(behavior: ScrollBehavior = 'auto') {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }

  useEffect(() => {
    snapToBottom('auto');
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distance < 120;
    if (nearBottom) {
      snapToBottom('auto');
      setShowJump(false);
    } else {
      setShowJump(true);
    }
  }, [messages, streamingText, isStreaming]);

  const lastAssistantIndex = [...messages]
    .reverse()
    .findIndex((message) => message.role === 'assistant');
  const streamingIndex = lastAssistantIndex >= 0 ? messages.length - 1 - lastAssistantIndex : -1;

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={() => {
          const container = containerRef.current;
          if (!container) return;
          const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
          setShowJump(distance >= 120);
        }}
        className="h-full space-y-5 overflow-y-auto px-8 py-8"
        aria-live="polite"
      >
        {messages.map((message, index) => (
          <ChatMessage
            key={`${message.id}-${index}`}
            message={message}
            accentTextClass={accentTextClass}
            accentBorderClass={accentBorderClass}
            agentSymbol={agentSymbol}
            agentCodename={agentCodename}
            isStreaming={isStreaming && index === streamingIndex}
            streamingText={isStreaming && index === streamingIndex ? streamingText : undefined}
          />
        ))}

        {isStreaming && !streamingText ? (
          <div className="max-w-[85%] rounded border-l-4 border-l-border-subtle bg-bg-panel px-4 py-3 text-sm italic text-text-secondary">
            {thinkingLabel}
          </div>
        ) : null}
      </div>

      {showJump ? (
        <button
          type="button"
          onClick={() => snapToBottom('smooth')}
          className="absolute bottom-4 right-6 rounded border border-border-subtle bg-bg-panel px-3 py-2 text-rune text-[10px] tracking-wider text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          ↓ Jump to latest
        </button>
      ) : null}
    </div>
  );
}
