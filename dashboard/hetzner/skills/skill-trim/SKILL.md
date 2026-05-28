---
name: skill-trim
description: Reads every installed Hermes skill's source files, asks a free critic to propose a shorter version while preserving intent, writes a diff report to AIOS/Reports/. Read-only — never auto-applies changes. Per AI Masterclass synthesis adoption #4.7.
version: 0.1.0
trigger: /skill-trim
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Skill Trim

## What it does

Reads every installed Hermes skill's source files, asks a free critic to propose a shorter version while preserving intent, writes a diff report to AIOS/Reports/. Read-only — never auto-applies changes. Per AI Masterclass synthesis adoption #4.7.

## When to use

Use this skill when the user asks for skill trim, or invokes the command `/skill-trim`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/skill-trim`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\skill-trim\main.py`
Tests: `test_skill_trim.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
