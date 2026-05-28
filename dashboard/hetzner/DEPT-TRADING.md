# DEPT-TRADING — Trading Department
> Owner: Thor · Model: ECC bridge / Claude Max · Updated: 2026-05-27

## Mission
All market analysis, trade reviews, risk assessment, paper trading supervision.

## Owns
- SPY / GOOGL / PLTR trade ideas and reviews
- Options swing trading signal analysis (IV/HV, unusual flow, order blocks, FVGs)
- Paper trading bots supervision (BTC, ETH, SPY on Droplet)
- Morning brief market section
- ParlayBot strategy review (Kelly criterion, edge validation)
- Future: Polymarket weather market bot (planned, not started — see ParlayBot future expansion)

## Active tools
- `tradingview-ta` + `tvdatafeed` Python (primary data path)
- TradingView Desktop + Chronos Pine Script overlay
- Hermes trading workers: `hermes-trading@{btc,eth,spy}.service` + 6h reflection timers
- `SHARED_MEMORY.md` at `C:\Users\woody\TradingView Assistant\`

## Strategy context
- Style: options swing trading
- Signals: IV/HV spread, unusual options flow, order blocks, fair value gaps, liquidity sweeps, multi-timeframe, institutional positioning
- Budget: small account, defined risk only
- Calmar-biased scoring (35/30/20/10/5 weights) on paper traders

## Escalation
Free-tier (Groq) handles routine market summaries. ECC bridge for deep position analysis or when Woody says "review this trade."
