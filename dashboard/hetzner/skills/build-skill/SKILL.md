---
name: build-skill
description: Meta-skill. Takes a natural-language description and an existing skill as the template, calls Claude Max with extended thinking to generate the skill.yaml + main.py for a new Hermes skill. Writes the proposed files to AIOS/Reports/build-skill-{name}/ for review — does NOT auto-in
version: 0.1.0
trigger: /build-skill
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Build Skill

## What it does

Meta-skill. Takes a natural-language description and an existing skill as the template, calls Claude Max with extended thinking to generate the skill.yaml + main.py for a new Hermes skill. Writes the proposed files to AIOS/Reports/build-skill-{name}/ for review — does NOT auto-install. Pattern from AI Masterclass video #25 (Agent Builds Teams of Agents).

## When to use

Use this skill when the user asks for build skill, or invokes the command `/build-skill`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/build-skill`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\build-skill\main.py`
Tests: `test_build_skill.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
