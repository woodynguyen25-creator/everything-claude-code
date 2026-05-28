# triad-router — Hermes Skill

The cost-aware Thinker pattern as a real Hermes capability. Decomposes any request into pieces, routes each to the optimal model considering capability + cost, and surfaces a visible execution plan before any worker runs.

## Why this exists

Woody's locked principle (2026-05-24): the Thinker is an **orchestrator**, not a worker. Every Forging should:

1. Heavily interrogate first (no question cap).
2. Decompose into discrete pieces.
3. Route each piece to the optimal model considering BOTH capability and cost.
4. Produce a visible plan.
5. Hand each piece to its assigned worker.

This skill implements that.

## Routing table

| Capability | Default model | Cost shape |
|---|---|---|
| `synthesis` | Claude Max (via ECC bridge) | flat subscription |
| `interrogate` | Claude Max | flat subscription |
| `code` | Codex CLI | flat $20/mo |
| `bulk` | DeepSeek | metered $0.27/M in, $1.10/M out |
| `scan` | Cerebras free tier | $0 |
| `critique` | Gemini Flash | $0 |

## DeepSeek cap behavior

- Tracks daily spend in `/home/hermes/.hermes/state/triad-daily-spend.json`
- Resets at local midnight (America/Chicago)
- **Soft warn at $0.50/day** — Telegram nudge, keep routing
- **Hard stop at $1.50/day** — `bulk` capability automatically reroutes to Codex CLI for rest of day

## Quad mode

Triggers when the request contains `ultrathink`, `deep dive`, `critique heavily`, or `quad`.
Adds up to 3 critique loops with cross-family critics. Hard cap at 3.

## Invocation

```
/triad <your forging>
```

Examples:
- `/triad build me a Hermes skill that scrapes WSJ headlines`
  → Plan: interrogate → scan → code → synthesis
- `/triad ultrathink the parlay bot kelly sizing formula`
  → Quad mode: interrogate → scan → synthesis → critique loop × 3 → final synthesis
- `/triad generate 50 cinematic prompts for lucky dog`
  → Plan: interrogate → bulk (DeepSeek; falls back to Codex if cap hit) → synthesis

## State files

```
/home/hermes/.hermes/state/triad-daily-spend.json
```

Shape:
```json
{
  "date": "2026-05-26",
  "spend": {
    "deepseek": 0.42
  }
}
```

## Deploy

```powershell
scp -r dashboard/hetzner/skills/triad-router root@142.93.12.177:/home/hermes/.hermes/skills/
ssh root@142.93.12.177
sudo -u hermes -i
mkdir -p /home/hermes/.hermes/state
hermes skill install /home/hermes/.hermes/skills/triad-router
hermes gateway restart
```

## Test

```bash
cd /home/hermes/.hermes/skills/triad-router
python -m pytest test_triad.py -v
```

All tests are network-free.

## v0.2 — what's not in v0.1 yet

Current v0.1 stops at the plan. Worker dispatch is stubbed (`execute_piece` returns "not_implemented").

v0.2 will wire up the actual workers:

1. **Claude Max worker** — HTTP POST to ECC bridge `/api/openai/v1/chat/completions` with `model=ecc/lebot-james`
2. **Codex worker** — subprocess to local Codex CLI on PC (via ECC bridge proxy)
3. **DeepSeek worker** — HTTP POST to `https://api.deepseek.com/v1/chat/completions`, track tokens, update spend file
4. **Cerebras/Groq/Gemini worker** — same HTTP shape per provider

Each worker should:
- Return tokens consumed
- Update `triad-daily-spend.json` if metered
- Append a row to `Command Center/AIOS/AIOS-ACTIVITY-LOG.md` via `/api/vault/write`

## Cost philosophy

Woody's monthly LLM target: **~$10 metered spend max**, on top of Claude Max ($20) and ChatGPT Plus ($20). Anything that routinely burns through that needs an architecture review, not more credits.
