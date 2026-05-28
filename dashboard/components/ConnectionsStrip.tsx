const CONNECTIONS = [
  { id: 'github', label: 'GitHub', mark: 'GH' },
  { id: 'playwright', label: 'Playwright', mark: 'PW' },
  { id: 'exa', label: 'Exa', mark: 'EX' },
  { id: 'firecrawl', label: 'Firecrawl', mark: 'FC' },
  { id: 'context7', label: 'Context7', mark: 'C7' },
  { id: 'fal', label: 'fal.ai', mark: 'FA' },
  { id: 'obsidian', label: 'Obsidian', mark: 'OB' },
  { id: 'tradingview', label: 'TradingView', mark: 'TV' },
];

export default function ConnectionsStrip() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CONNECTIONS.map((connection) => (
        <div
          key={connection.id}
          title={connection.label}
          className="flex h-7 items-center justify-center rounded border border-border-subtle bg-bg-deep text-[10px] font-mono text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          {connection.mark}
        </div>
      ))}
    </div>
  );
}
