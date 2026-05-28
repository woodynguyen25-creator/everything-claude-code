# DEPT-DEV — Development Department
> Owner: Perseus · Model: ECC bridge / Claude Max · Updated: 2026-05-27

## Mission
All code. Build, debug, refactor, architecture decisions. Uses full Claude Code + 270 ECC skills via ECC bridge.

## Owns
- Code generation and refactoring
- Bug fixes and debugging
- Architecture decisions (dashboard, ParlayBot, Whisper Dictate, Hermes skills)
- ECC repo maintenance (skills, hooks, agents)
- PR reviews via GitHub MCP

## Active codebases
- `C:\Github Repos\everything-claude-code` — AIOS hub (Next.js 14, Norse dashboard)
- `C:\Github Repos\lucky-dog-landing` — cinematic landing (Vite + React + Three.js)
- `C:\Github Repos\parlay-bot` — DFS bot (Python + SQLite + Telegram)
- `C:\Users\woody\whisper-dictate\` — dictation tool (Python + Groq Whisper)
- `/home/hermes/` — Droplet (Hermes Agent, trading workers, skills)

## Stack notes
- Next.js: always bind `127.0.0.1`, never `::` (freezes Claude Code panel)
- Python: Groq API is primary for LLM calls (free tier); Claude API only for complex reasoning
- Hermes skills: Hermes Agent v0.14.0 format; skill.yaml + main.py

## Escalation
Complex architectural decisions → invoke triad/quad mode. Quick fixes → Groq/Gemini Flash directly.
