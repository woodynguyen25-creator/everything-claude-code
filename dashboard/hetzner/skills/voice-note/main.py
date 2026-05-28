"""Hermes Voice Note skill.

Pipeline: Telegram voice message -> Groq Whisper transcript -> tag-routed
markdown write into Woody's Obsidian Command Center vault via the shared
vault helper.

Falls back to local /tmp save if the bridge is unreachable so no voice is
lost. Always logs to AIOS-ACTIVITY-LOG.
"""

from __future__ import annotations

import datetime as _dt
import os
import sys
import textwrap
from pathlib import Path
from typing import Any, Dict

import requests

# Make _shared importable when this skill runs from ~/.hermes/skills/voice-note/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import vault  # type: ignore
except ImportError:
    vault = None  # tests can run without _shared on sys.path

GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
WHISPER_MODEL = "whisper-large-v3-turbo"
WHISPER_BIAS_PROMPT = (
    "Woody. Trading. Lucky Dog. ParlayBot. Hermes. AIOS. Solo Store. "
    "TradingView. SPY GOOGL PLTR. Vibecode. Internship. Yggdrasil. Bifrost."
)

TAG_TO_FOLDER: Dict[str, str] = {
    "#trading":  "Trading Assistant/Voice Notes",
    "#luckydog": "Lucky Dog Landing Page/Voice Notes",
    "#parlay":   "ParlayBot/Voice Notes",
    "#solo":     "Solo Store/Voice Notes",
    "#homework": "Homework/Voice Notes",
    "#idea":     "_inbox",
}
DEFAULT_FOLDER = "_inbox"


def transcribe(ogg_bytes: bytes) -> str:
    if not GROQ_KEY:
        raise RuntimeError("GROQ_API_KEY not configured")
    response = requests.post(
        GROQ_TRANSCRIBE_URL,
        headers={"Authorization": f"Bearer {GROQ_KEY}"},
        files={"file": ("voice.ogg", ogg_bytes, "audio/ogg")},
        data={
            "model": WHISPER_MODEL,
            "language": "en",
            "prompt": WHISPER_BIAS_PROMPT,
            "temperature": "0",
        },
        timeout=30,
    )
    response.raise_for_status()
    text = response.json().get("text", "").strip()
    if not text:
        raise RuntimeError("empty transcript from Groq Whisper")
    return text


def pick_folder(transcript: str) -> str:
    lowered = transcript.lower()
    for tag, folder in TAG_TO_FOLDER.items():
        if tag in lowered:
            return folder
    return DEFAULT_FOLDER


def build_note(transcript: str, ts_iso: str, ts_filename: str) -> str:
    return textwrap.dedent(
        f"""\
        ---
        title: Voice {ts_filename}
        tags: [voice, inbox, telegram]
        created: {ts_iso}
        source: telegram-voice
        ---

        # 🎤 Voice {ts_filename}

        {transcript}
        """
    ).strip() + "\n"


def write_local_fallback(filename: str, content: str) -> str:
    fallback_path = Path("/tmp") / filename
    fallback_path.write_text(content, encoding="utf-8")
    return str(fallback_path)


def handle_voice(event: Dict[str, Any]) -> Dict[str, Any]:
    """Hermes entry point. event["voice"]["file_bytes"] is OGG audio bytes."""
    ogg_bytes = event["voice"]["file_bytes"]

    transcript = transcribe(ogg_bytes)
    folder = pick_folder(transcript)

    now = _dt.datetime.now()
    ts_filename = now.strftime("%Y-%m-%d-%H%M")
    ts_iso = now.isoformat(timespec="seconds")
    filename = f"voice-{ts_filename}.md"
    note = build_note(transcript, ts_iso, ts_filename)

    if vault is None:
        saved_path = write_local_fallback(filename, note)
        return {
            "reply": f"⚠️ shared vault helper unavailable; saved to `{saved_path}`",
            "saved_path": saved_path,
            "routed_to": "droplet_fallback",
        }

    try:
        saved_path = vault.write(folder, filename, note, mode="create")
        reply = f"✅ Saved to `{folder}/{filename}`\n\n> {transcript[:140]}"
        try:
            vault.log_activity(
                task="voice-note",
                outcome="✅",
                summary=f"saved to {folder}",
                notes=f"transcript_len={len(transcript)}",
            )
        except vault.VaultBridgeError:
            pass
        return {"reply": reply, "saved_path": saved_path, "routed_to": folder}
    except vault.VaultBridgeError as exc:
        saved_path = write_local_fallback(filename, note)
        reply = (
            "⚠️ PC bridge unreachable — voice saved locally on Droplet at "
            f"`{saved_path}`. `voice-flush` cron will replay it when PC is back.\n\n"
            f"> {transcript[:140]}"
        )
        return {
            "reply": reply,
            "saved_path": saved_path,
            "routed_to": "droplet_fallback",
            "error": str(exc),
        }
