"""/journal — daily reflection prompt for Woody.

Pulls today's activity log signal + open task signals, generates a prompt
in the practical Buddhist-aware tone Woody prefers (he writes Buddhist
poetry; references include karma, attention, impermanence, chánh niệm).

Default mode: returns the prompt in Telegram for him to think about.
With `--save`: also writes the prompt to today's Daily Note in the vault.

Tone discipline:
- Not motivational. Not life-coach. Not preachy.
- Two anchored questions max + one observation
- Reference *what actually happened today* (not generic prompts)
- Buddhist framing only when it fits — "what reacted in you" not "be mindful"
"""

from __future__ import annotations

import datetime as _dt
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import models as workers  # type: ignore
    from _shared import vault              # type: ignore
except ImportError:
    workers = None
    vault = None


JOURNAL_SYSTEM_PROMPT = """\
You are Woody's evening reflection partner. He is 19, in Houston, building
toward Wall Street + AI consulting, swing-trades options (SPY/GOOGL/PLTR),
walks after meals, writes Buddhist-inspired poetry (Pure Land lean), tracks
impermanence + attention + what he actually controlled.

You will receive context about his day from the AIOS activity log. Generate
a reflection prompt with this structure:

## One observation
ONE concrete line about what the activity log shows. Specific, not generic.

## Two questions
TWO questions, each anchored to today. Quality:
- One question about ATTENTION (what got it vs what he chose to give it to)
- One question about INTENT (what he wanted to happen vs what actually happened)
- Reference specifics: tickers, projects, app names, task IDs from the log
- Buddhist framing ONLY if it lands — "what reacted in you" vs "be mindful"
- Direct. No motivational filler. No "I hope" or "I'm proud."

## One quiet line (optional)
A single italic line — could be a fragment of a haiku, a sutra phrase, or
a plain observation. ONLY include if it fits naturally. Often skip it.

Total length: under 120 words. He reads this on his phone before sleep.
Don't pad. Don't summarize the day back to him.
"""


def gather_signal() -> Dict[str, Any]:
    """Pull what we know about today from the activity log + vault."""
    signal: Dict[str, Any] = {
        "activity_rows": [],
        "today_voice_notes": [],
        "errors_today": [],
        "fetched_at": _dt.datetime.now().isoformat(timespec="seconds"),
    }
    if vault is None:
        return signal

    today = _dt.datetime.now().strftime("%Y-%m-%d")
    try:
        log = vault.read("AIOS", "AIOS-ACTIVITY-LOG.md")
    except Exception:
        return signal

    rows: List[Dict[str, str]] = []
    for line in log.split("\n"):
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.split("|")]
        if len(cols) < 8 or not cols[1].startswith(today):
            continue
        if not re.match(r"^\d{4}-\d{2}-\d{2}T", cols[1]):
            continue
        rows.append({
            "ts": cols[1][11:16],
            "task": cols[2],
            "outcome": cols[3],
            "summary": cols[4],
            "notes": cols[7],
        })
    signal["activity_rows"] = rows
    signal["errors_today"] = [r for r in rows if "❌" in r["outcome"] or "⚠️" in r["outcome"]]

    # Look for voice notes saved today
    try:
        entries = vault.list_entries(folder="", glob=f"voice-{today}-*.md", recursive=True, limit=20)
        signal["today_voice_notes"] = [e["relativePath"] for e in entries]
    except Exception:
        pass

    return signal


def build_signal_block(signal: Dict[str, Any]) -> str:
    if not signal["activity_rows"]:
        return "No activity logged today — quiet day, or AIOS was off."

    lines = [f"Today's AIOS activity ({len(signal['activity_rows'])} events):"]
    # Group by task
    by_task: Dict[str, int] = {}
    for r in signal["activity_rows"]:
        by_task[r["task"]] = by_task.get(r["task"], 0) + 1
    lines.append("")
    for task, count in sorted(by_task.items(), key=lambda x: -x[1])[:8]:
        lines.append(f"- {task} × {count}")

    if signal["errors_today"]:
        lines.append("")
        lines.append(f"Friction today: {len(signal['errors_today'])} non-success events")
        for e in signal["errors_today"][:3]:
            lines.append(f"- {e['ts']} {e['task']}: {e['notes'][:60]}")

    if signal["today_voice_notes"]:
        lines.append("")
        lines.append(f"Voice notes captured: {len(signal['today_voice_notes'])}")

    return "\n".join(lines)


def save_to_daily_note(prompt: str) -> str | None:
    if vault is None:
        return None
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    section = (
        f"\n## 🌙 Evening reflection ({_dt.datetime.now().strftime('%H:%M')})\n\n"
        f"{prompt}\n"
    )
    try:
        # Append to today's daily note; create if absent
        try:
            vault.read("Daily Notes", f"{today}.md")
            existed = True
        except Exception:
            existed = False
        if not existed:
            header = (
                f"---\n"
                f"title: {today}\n"
                f"tags: [daily-note]\n"
                f"created: {today}\n"
                f"---\n\n"
                f"# {today}\n\n"
            )
            vault.write("Daily Notes", f"{today}.md", header + section, mode="create")
        else:
            vault.write("Daily Notes", f"{today}.md", section, mode="append")
        return f"Daily Notes/{today}.md"
    except Exception:
        return None


def run(event: Dict[str, Any]) -> Dict[str, Any]:
    text = (event.get("text") or "").strip()
    save_to_vault = "--save" in text

    if workers is None:
        return {"reply": "⚠️ shared workers unavailable; can't generate journal prompt"}

    signal = gather_signal()
    signal_block = build_signal_block(signal)

    try:
        result = workers.dispatch(
            "claude-max",
            f"Context — today's activity:\n\n{signal_block}\n\nGenerate the reflection prompt now.",
            system=JOURNAL_SYSTEM_PROMPT,
            max_tokens=600,
            allow_fallback=True,
        )
    except workers.WorkerError as exc:  # type: ignore[attr-defined]
        return {"reply": f"⚠️ Journal generation failed: {exc}"}

    prompt = result["text"].strip()
    saved_path: str | None = None
    if save_to_vault:
        saved_path = save_to_daily_note(prompt)

    if vault is not None:
        try:
            vault.log_activity(
                task="journal-prompt",
                outcome="✅",
                summary=f"reflection generated{' + saved' if saved_path else ''}",
                tokens=result["tokens_in"] + result["tokens_out"],
                cost_usd=result["cost_usd"],
                notes=f"activity_rows={len(signal['activity_rows'])}",
            )
        except Exception:
            pass

    reply = "🌙 *Evening reflection*\n\n" + prompt
    if saved_path:
        reply += f"\n\n_Saved to `{saved_path}`_"
    elif save_to_vault:
        reply += "\n\n_(`--save` requested but vault unreachable)_"

    return {
        "reply": reply,
        "prompt": prompt,
        "saved_path": saved_path,
        "signal_summary": signal_block[:300],
    }
