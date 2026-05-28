---
name: voice-note
description: Transcribe Telegram voice memos from Woody and save them to the Obsidian Command Center vault inbox. Auto-routes by hashtag (#trading, #luckydog,
version: 0.1.0
trigger: /voice-note
runtime: python (on Woody's PC dashboard via ECC bridge)
---

# Voice Note

## What it does

Transcribe Telegram voice memos from Woody and save them to the Obsidian Command Center vault inbox. Auto-routes by hashtag (#trading, #luckydog,

## When to use

Use this skill when the user asks for voice note, or invokes the command `/voice-note`.

## How to invoke

This skill is implemented as a Python service on Woody's PC dashboard. To run it, the request
must reach the PC via the ECC bridge (Tailscale → `100.69.115.98:3738/api/skills/voice-note`).
The bridge requires `ECC_BRIDGE_TOKEN` (already in `~/.hermes/.env`).

When the user is AFK, the PC may be offline — in that case, the skill is unavailable until
the PC dashboard comes back. The Hermes Agent should fall back to its own capabilities (search,
memory, reasoning) and tell the user the skill will run when the PC is reachable again.

## Source of truth

Python source: `C:\Github Repos\everything-claude-code\dashboard\hetzner\skills\voice-note\main.py`
Tests: `test_voice_note.py` (network-free pytest suite).

---

*Auto-generated SKILL.md wrapper. Edit `skill.yaml` upstream and re-run `generate-skill-md.js` to regenerate.*
