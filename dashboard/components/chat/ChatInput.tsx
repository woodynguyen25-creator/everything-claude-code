'use client';

import { useEffect, useRef } from 'react';
import { RuneButton } from '@/components/ui/RuneButton';

type Props = {
  inputId?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onHold: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder: string;
  costEstimate: number;
  modelLabel?: string;
  godMode?: boolean;
  godModeLabel?: string;
  onToggleGodMode?: () => void;
};

export default function ChatInput({
  inputId = 'council-input',
  value,
  onChange,
  onSubmit,
  onHold,
  isStreaming,
  disabled = false,
  placeholder,
  costEstimate,
  modelLabel,
  godMode = false,
  godModeLabel,
  onToggleGodMode,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, [value]);

  return (
    <div className="border-t border-border-subtle bg-bg-panel/95 px-8 py-5 backdrop-blur-sm">
      <div className="rounded border border-border-subtle bg-bg-deep p-3">
        <textarea
          id={inputId}
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (isStreaming) {
                onHold();
              } else {
                onSubmit();
              }
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="max-h-48 min-h-12 w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-text-primary outline-none placeholder:text-text-muted"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-numeric text-xs text-text-muted">~${costEstimate.toFixed(2)}</div>
            {modelLabel ? <div className="font-numeric text-[10px] text-text-muted">{modelLabel}</div> : null}
          </div>
          {godModeLabel && onToggleGodMode ? (
            <RuneButton
              variant={godMode ? 'shimmer' : 'ghost'}
              size="sm"
              aria-label={godModeLabel}
              onClick={onToggleGodMode}
              icon="⚡"
            >
              {godModeLabel}
            </RuneButton>
          ) : null}
          {isStreaming ? (
            <button
              type="button"
              aria-label="Hold the council stream"
              onClick={onHold}
              className="rounded bg-blood px-4 py-2 text-rune text-xs font-semibold tracking-wider text-text-primary transition-colors hover:bg-blood/90"
            >
              Hold
            </button>
          ) : (
            <RuneButton
              variant="glow"
              size="md"
              aria-label="Summon the council"
              onClick={onSubmit}
              disabled={disabled || !value.trim()}
              iconRight="→"
            >
              Summon · ~${costEstimate.toFixed(2)}
            </RuneButton>
          )}
        </div>
      </div>
    </div>
  );
}
