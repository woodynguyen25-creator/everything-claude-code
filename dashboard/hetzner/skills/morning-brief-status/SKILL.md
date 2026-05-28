---
name: morning-brief-status
description: Quick Telegram lookup — did today's morning brief fire, and what's in it? Reads today's brief note from the Trading Assistant folder and surfaces the headline + watchlist. Falls back to the activity log if no file found.
version: 0.1.0
trigger: /morning-brief-status
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Morning Brief Status

## What it does

Quick Telegram lookup — did today's morning brief fire, and what's in it? Reads today's brief note from the Trading Assistant folder and surfaces the headline + watchlist. Falls back to the activity log if no file found.

## When to use

Use this skill when the user asks for morning brief status, or invokes the command `/morning-brief-status`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/morning-brief-status`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\morning-brief-status\main.py`
Tests: `test_morning_brief_status.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
