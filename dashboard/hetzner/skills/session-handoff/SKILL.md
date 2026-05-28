---
name: session-handoff
description: Hermes-side session snapshot. Aggregates today's activity log rows, DeepSeek spend, voice-note fallbacks pending flush, and active cron jobs into a BATON-style note. Triggered from Telegram when Woody is about to step away or wants the AIOS to summarize itself.
version: 0.1.0
trigger: /session-handoff
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Session Handoff

## What it does

Hermes-side session snapshot. Aggregates today's activity log rows, DeepSeek spend, voice-note fallbacks pending flush, and active cron jobs into a BATON-style note. Triggered from Telegram when Woody is about to step away or wants the AIOS to summarize itself.

## When to use

Use this skill when the user asks for session handoff, or invokes the command `/session-handoff`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/session-handoff`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\session-handoff\main.py`
Tests: `test_session_handoff.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
