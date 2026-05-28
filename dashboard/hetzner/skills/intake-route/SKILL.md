---
name: intake-route
description: Auto-router. Takes any Telegram message, runs it through /classify, and
version: 0.1.0
trigger: /intake-route
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Intake Route

## What it does

Auto-router. Takes any Telegram message, runs it through /classify, and

## When to use

Use this skill when the user asks for intake route, or invokes the command `/intake-route`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/intake-route`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\intake-route\main.py`
Tests: `test_intake_route.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
