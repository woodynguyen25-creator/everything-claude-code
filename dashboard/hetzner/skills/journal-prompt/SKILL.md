---
name: journal-prompt
description: Daily reflection prompt. Pulls today's activity log + open tasks + yesterday's trades, generates a personal reflection prompt in a Buddhist- aware tone Woody prefers (impermanence, attention, what you actually controlled vs reacted to). Optionally saves to Daily Notes.
version: 0.1.0
trigger: /journal-prompt
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Journal Prompt

## What it does

Daily reflection prompt. Pulls today's activity log + open tasks + yesterday's trades, generates a personal reflection prompt in a Buddhist- aware tone Woody prefers (impermanence, attention, what you actually controlled vs reacted to). Optionally saves to Daily Notes.

## When to use

Use this skill when the user asks for journal prompt, or invokes the command `/journal-prompt`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/journal-prompt`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\journal-prompt\main.py`
Tests: `test_journal_prompt.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
