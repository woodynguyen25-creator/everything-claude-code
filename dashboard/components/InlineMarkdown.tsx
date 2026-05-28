'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  text: string;
  className?: string;
};

export default function InlineMarkdown({ text, className = '' }: Props) {
  return (
    <div
      className={`prose prose-invert max-w-none prose-p:my-0 prose-p:text-inherit prose-strong:text-text-primary prose-code:text-rune-gold prose-code:font-mono ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
