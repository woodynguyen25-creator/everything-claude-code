---
name: forge
description: End-to-end orchestrator. Takes a high-level goal, runs it through the full
version: 0.1.0
trigger: /forge
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Forge

## What it does

End-to-end orchestrator. Takes a high-level goal, runs it through the full

## When to use

Use this skill when the user asks for forge, or invokes the command `/forge`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/forge`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\forge\main.py`
Tests: `test_forge.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
