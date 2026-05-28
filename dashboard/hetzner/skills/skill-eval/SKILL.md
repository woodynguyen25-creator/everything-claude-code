---
name: skill-eval
description: Runs every installed skill's pytest suite, aggregates pass/fail counts, surfaces failing skills with one-line summaries. Telegram-friendly health check for the skill catalog. Read-only.
version: 0.1.0
trigger: /skill-eval
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Skill Eval

## What it does

Runs every installed skill's pytest suite, aggregates pass/fail counts, surfaces failing skills with one-line summaries. Telegram-friendly health check for the skill catalog. Read-only.

## When to use

Use this skill when the user asks for skill eval, or invokes the command `/skill-eval`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/skill-eval`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\skill-eval\main.py`
Tests: `test_skill_eval.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
