---
name: aios-audit
description: The 4 C's coverage audit (Context · Connections · Capabilities · Cadence). Walks the live AIOS, identifies coverage gaps, stale skills, unused MCPs, silent-failure jobs. Writes a dated report to AIOS/Reports/ and one row to AIOS-ACTIVITY-LOG. Per Masterclass adoption #2.
version: 0.1.0
trigger: /aios-audit
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Aios Audit

## What it does

The 4 C's coverage audit (Context · Connections · Capabilities · Cadence). Walks the live AIOS, identifies coverage gaps, stale skills, unused MCPs, silent-failure jobs. Writes a dated report to AIOS/Reports/ and one row to AIOS-ACTIVITY-LOG. Per Masterclass adoption #2.

## When to use

Use this skill when the user asks for aios audit, or invokes the command `/aios-audit`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/aios-audit`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\aios-audit\main.py`
Tests: `test_aios_audit.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
