---
name: md-ingest
description: Convert a PDF / HTML / DOCX / image into clean markdown for downstream Claude consumption. Wraps the local `docling` CLI on the PC via the dashboard. Drops the converted file into AIOS/ingest/<date>/<basename>.md.
version: 0.1.0
trigger: /md-ingest
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Md Ingest

## What it does

Convert a PDF / HTML / DOCX / image into clean markdown for downstream Claude consumption. Wraps the local `docling` CLI on the PC via the dashboard. Drops the converted file into AIOS/ingest/<date>/<basename>.md.

## When to use

Use this skill when the user asks for md ingest, or invokes the command `/md-ingest`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/md-ingest`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\md-ingest\main.py`
Tests: `test_md_ingest.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
