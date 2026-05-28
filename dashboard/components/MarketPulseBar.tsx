'use client';

import { useEffect, useRef, useState } from 'react';

const SYMBOLS = [
  { proName: 'AMEX:SPY', title: 'SPY' },
  { proName: 'AMEX:IWM', title: 'IWM' },
  { proName: 'CBOE:VIX', description: 'VIX' },
  { proName: 'FOREXCOM:SPXUSD', title: 'SPX' },
  { proName: 'NASDAQ:NVDA', description: 'NVDA' },
  { proName: 'NASDAQ:META', description: 'META' },
  { proName: 'NASDAQ:MSFT', description: 'MSFT' },
  { proName: 'NASDAQ:AAPL', description: 'AAPL' },
  { proName: 'NASDAQ:TSLA', description: 'TSLA' },
  { proName: 'NYSE:PLTR', description: 'PLTR' },
  { proName: 'NASDAQ:HOOD', description: 'HOOD' },
  { proName: 'NASDAQ:AMZN', description: 'AMZN' },
  { proName: 'NASDAQ:GOOGL', description: 'GOOGL' },
];

const STORAGE_KEY = 'market-pulse-enabled';

// Detect Obsidian Custom Frames / VS Code webview — TradingView CDN script freezes those.
function isConstrainedWebview(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Electron|Obsidian|vscode/i.test(ua);
}

export default function MarketPulseBar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Read persisted preference once. Default: OFF in webviews, OFF on first visit anywhere
  // (user opts in once, stays on across reloads).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // Auto-enable only if user previously opted in AND we're not in a constrained webview
      if (stored === 'true' && !isConstrainedWebview()) setEnabled(true);
    } catch {
      // localStorage unavailable — leave disabled
    }
    setHasChecked(true);
  }, []);

  // Load TradingView widget only when explicitly enabled
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    containerRef.current.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.textContent = JSON.stringify({
      symbols: SYMBOLS,
      showSymbolLogo: false,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'en',
    });
    containerRef.current.appendChild(script);
    const el = containerRef.current;

    return () => {
      if (el) el.innerHTML = '';
    };
  }, [enabled]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try { window.localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
  };

  if (!hasChecked) {
    // SSR-safe placeholder — same height to prevent layout shift
    return <div className="h-[46px] border-b border-border-subtle/30 bg-bg-panel/70" />;
  }

  if (!enabled) {
    return (
      <div className="flex h-[46px] items-center justify-center border-b border-border-subtle/30 bg-bg-panel/70 backdrop-blur-sm">
        <button
          type="button"
          onClick={toggle}
          className="cursor-pointer rounded-full border border-border-subtle px-3 py-1 font-mono text-[10px] tracking-wider text-text-muted hover:border-rune-gold hover:text-rune-gold transition-colors"
          title="Loads external TradingView script. Disabled by default to avoid freezing Obsidian/VS Code webview panes."
        >
          ⟳ LOAD MARKET TICKER
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-border-subtle/30 bg-bg-panel/70 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="tradingview-widget-container h-[46px] w-full overflow-hidden [&_iframe]:!bg-transparent"
      />
    </div>
  );
}
