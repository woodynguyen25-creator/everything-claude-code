---
name: triad-router
description: Cost-aware orchestrator. Decomposes a Forging into pieces and routes each piece to the best-fit model (Claude Max, Codex, DeepSeek, free tiers) considering both capability AND Woody's real budget. Implements the triad/quad pattern locked 2026-05-24.
version: 0.1.0
trigger: /triad-router
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Triad Router

## What it does

Cost-aware orchestrator. Decomposes a Forging into pieces and routes each piece to the best-fit model (Claude Max, Codex, DeepSeek, free tiers) considering both capability AND Woody's real budget. Implements the triad/quad pattern locked 2026-05-24.

## When to use

Use this skill when the user asks for triad router, or invokes the command `/triad-router`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/triad-router`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\triad-router\main.py`
Tests: `test_triad_router.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
