---
name: think
description: Sequential-thinking scratchpad. Forces the model to break a hard question into ordered reasoning steps before answering — useful when Woody asks something that needs structured analysis (trade thesis, life decision, architecture call). Routes through Claude Max with system prompt
version: 0.1.0
trigger: /think
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Think

## What it does

Sequential-thinking scratchpad. Forces the model to break a hard question into ordered reasoning steps before answering — useful when Woody asks something that needs structured analysis (trade thesis, life decision, architecture call). Routes through Claude Max with system prompt that enforces the step-by-step shape.

## When to use

Use this skill when the user asks for think, or invokes the command `/think`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/think`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\think\main.py`
Tests: `test_think.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
