---
name: aios-help
description: List every installed Hermes skill with its description and trigger. Auto-generated from skill.yaml manifests — no manual maintenance.
version: 0.1.0
trigger: /aios-help
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Aios Help

## What it does

List every installed Hermes skill with its description and trigger. Auto-generated from skill.yaml manifests — no manual maintenance.

## When to use

Use this skill when the user asks for aios help, or invokes the command `/aios-help`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/aios-help`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\aios-help\main.py`
Tests: `test_aios_help.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
