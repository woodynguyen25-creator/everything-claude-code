---
name: workflow-or-agent
description: Before building anything new, answer the workflow-vs-agent filter from AI Masterclass video #15/#34. Takes a problem description, scores it on determinism, tool selection variability, and reasoning depth, and returns WORKFLOW or AGENT with reasoning. Cheap free-tier call (Cerebra
version: 0.1.0
trigger: /workflow-or-agent
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Workflow Or Agent

## What it does

Before building anything new, answer the workflow-vs-agent filter from AI Masterclass video #15/#34. Takes a problem description, scores it on determinism, tool selection variability, and reasoning depth, and returns WORKFLOW or AGENT with reasoning. Cheap free-tier call (Cerebras).

## When to use

Use this skill when the user asks for workflow or agent, or invokes the command `/workflow-or-agent`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/workflow-or-agent`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\workflow-or-agent\main.py`
Tests: `test_workflow_or_agent.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
