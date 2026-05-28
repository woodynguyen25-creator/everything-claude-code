---
name: aios-prune
description: Companion to /aios-audit. Reads the most recent audit report and proposes specific skills/MCPs/jobs to delete with one-line reasoning each. Writes a prune-proposal to AIOS/Reports/. Read-only — never auto-deletes. Run monthly after the weekly /aios-audit accumulates evidence.
version: 0.1.0
trigger: /aios-prune
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Aios Prune

## What it does

Companion to /aios-audit. Reads the most recent audit report and proposes specific skills/MCPs/jobs to delete with one-line reasoning each. Writes a prune-proposal to AIOS/Reports/. Read-only — never auto-deletes. Run monthly after the weekly /aios-audit accumulates evidence.

## When to use

Use this skill when the user asks for aios prune, or invokes the command `/aios-prune`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/aios-prune`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\aios-prune\main.py`
Tests: `test_aios_prune.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
