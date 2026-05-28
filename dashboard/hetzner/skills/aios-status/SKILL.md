---
name: aios-status
description: On-demand AIOS health check via Telegram. Pings PC bridge, reports DeepSeek spend, lists last 5 scheduled jobs that ran, summarizes idle ones. Use when away from PC and want a quick "is everything alive" answer.
version: 0.1.0
trigger: /aios-status
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Aios Status

## What it does

On-demand AIOS health check via Telegram. Pings PC bridge, reports DeepSeek spend, lists last 5 scheduled jobs that ran, summarizes idle ones. Use when away from PC and want a quick "is everything alive" answer.

## When to use

Use this skill when the user asks for aios status, or invokes the command `/aios-status`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/aios-status`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\aios-status\main.py`
Tests: `test_aios_status.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
