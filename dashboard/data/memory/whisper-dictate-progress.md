# Whisper Dictate — Progress

> Local-first push-to-talk dictation tool living at `C:\Users\woody\whisper-dictate\`. Free Wispr Flow replacement. This file is the dashboard's running memory of where the project is and what's next.

**Status:** ✅ Live and Wispr-Flow-parity on long dictations.
**Last update:** 2026-05-23

---

## Where we are now (V3, 2026-05-23)

**Transcription pipeline (today):**
1. Hold `Win + Alt` → mic captures audio (60Hz poll-loop hotkey, immune to Windows OS swallowing Win-key events).
2. Release → audio sent to **Groq `whisper-large-v3-turbo`** (cloud, ~0.4-0.6s, constant regardless of clip length). `INITIAL_PROMPT` passed as bias for vocab/voice ("Claude Code, AIOS, ECC, TradingView, Lucky Dog…").
3. If Groq fails (offline, rate limit) → silent fall-through to **local faster-whisper** (small.en + tiny.en fast-path, both pre-warmed).
4. **corrections.json** applied (brand/proper-noun fixes).
5. **Groq `llama-3.3-70b`** cleanup pass (punctuation, capitalization, backtrack handling — explicitly NOT paraphrasing). Falls back to local **Ollama `qwen2.5:7b`** if Groq down, then raw text.
6. Clipboard paste into focused app.

**Latency reality:**

| Clip length | Before today | After today |
|---|---|---|
| Short ("yes go ahead") | 0.5s | ~0.5-0.7s |
| Long (15-30s dictation) | ~2s | **~0.5-0.7s** ← Wispr-Flow parity moment |

**Privacy:** Raw audio now leaves the machine (Groq). User approved 2026-05-23: *"I assume Wispr Flow already knows what I'd say."* Identity shifted from fully-local to cloud-first with offline fallback.

---

## Recent shipped (newest first)

- **2026-05-23 (V3)** — Groq `whisper-large-v3-turbo` as primary transcription, local as offline fallback. `transcribe_groq.py` (stdlib-only, ~140 lines, urllib + wave). `beam_size 5→1` config knob. Tray restarted, smoke test passed.
- **2026-05-17 (V2)** — 60Hz poll-loop hotkey replaces event hooks. Press tolerance + release debounce. Atomic frame swap fixes lost-recording bug. Indicator "arming" state (instant ~16ms feedback).
- **2026-05-15** — Floating mic pill indicator, singleton kernel mutex, log rotation (5×1MB), tiny.en fast path for <4s clips, terminal context-skip (raw mode), MAX_AUDIO_SECONDS 60→120.

---

## What user said they want next (their words)

> "Maybe something I want to change and improve is make the thing that pops up where it says listening, make it a little bit nicer looking, kind of the thing where Wispr Flow has, with a nicer sound instead of that distinctive beep. But those are just all cosmetic and things that aren't really necessary."

**Cosmetic queue (user flagged as "not necessary" but worth doing):**
- **Nicer indicator pill** — current is a flat 180×44 rounded rect with a pulsing red/orange dot. Wispr uses a slim glassy capsule with subtle blur and tiny animated wave bars. Tkinter has limits; a frameless `pywebview` or `PySide6` widget could host real CSS/blur. Or stick with Tkinter and add a gradient sweep + thinner profile.
- **Nicer sounds** — replace `winsound.Beep(880, 80)` start and `winsound.Beep(660, 80)` stop with two soft mp3/wav plinks. Need to source two royalty-free sub-200ms sounds.

---

## Bench items (functional, not requested yet)

- Voice commands ("scratch that", "new paragraph", "select all", spoken "period"/"comma")
- Per-app cleanup profiles (Obsidian formal, chat casual, email medium)
- Dictation history in tray menu (last 10, click to re-paste)
- Custom-dictionary UI for quick `corrections.json` adds
- **Expand `INITIAL_PROMPT`** with more personal vocab — highest-leverage accuracy lever, no code needed

---

## Reverting

- Cloud → local: `TRANSCRIBE_BACKEND = 'local'` in `config.py`, restart tray
- Greedy → beam: `BEAM_SIZE = 5` in `config.py`, restart tray
- Disable AI cleanup: `AI_CLEANUP = False`

## Files

```
C:\Users\woody\whisper-dictate\
  ├─ main.py              tray + hotkey poll loop + indicator wiring
  ├─ recorder.py          mic capture, atomic frame swap
  ├─ transcriber.py       Groq-first, local fallback
  ├─ transcribe_groq.py   NEW — Groq whisper API client
  ├─ postprocess.py       corrections + Groq/Ollama cleanup pipeline
  ├─ indicator.py         floating mic pill (Tkinter, always-on-top)
  ├─ window_context.py    raw-mode detection for terminals
  ├─ singleton.py         kernel mutex (no duplicate trays)
  ├─ corrections.json     brand/proper-noun lookup table
  └─ config.py            ALL knobs live here
```
