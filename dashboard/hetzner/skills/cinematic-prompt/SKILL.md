---
name: cinematic-prompt
description: Takes a raw idea and returns a cinematographer-grade prompt for image or video generation. Specifies subject + setting + camera + lighting + atmosphere + style references. Use for Lucky Dog hero animations, Solo Store poster prompts, AI consulting client B-roll. Per AI Masterclas
version: 0.1.0
trigger: /cinematic-prompt
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Cinematic Prompt

## What it does

Takes a raw idea and returns a cinematographer-grade prompt for image or video generation. Specifies subject + setting + camera + lighting + atmosphere + style references. Use for Lucky Dog hero animations, Solo Store poster prompts, AI consulting client B-roll. Per AI Masterclass video #18 (Sora 2 + n8n agents).

## When to use

Use this skill when the user asks for cinematic prompt, or invokes the command `/cinematic-prompt`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/cinematic-prompt`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\cinematic-prompt\main.py`
Tests: `test_cinematic_prompt.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
