"""/aios-onboard — quarterly 7-question intake.

Stateful conversation per chat_id. Asks one question, persists answer, asks
the next. After question 7, synthesizes answers into AIOS/Memory/intake.md.

State lives at /home/hermes/.hermes/state/onboard-<chat_id>.json so the
conversation survives Hermes restarts.

The 7 questions are from Nate Herk's `/aios-onboard` template, refined for
Woody's stack and the 4 C's audit pairing.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import sys
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import vault  # type: ignore
except ImportError:
    vault = None

STATE_DIR = Path(os.environ.get("ONBOARD_STATE_DIR", "/home/hermes/.hermes/state"))

QUESTIONS: List[Dict[str, str]] = [
    {
        "key": "identity",
        "prompt": (
            "1/7 — *Who are you right now?*\n\n"
            "Quick snapshot: role, current life situation, what you spend the "
            "most hours on this week. 2-3 sentences."
        ),
    },
    {
        "key": "recent_writing",
        "prompt": (
            "2/7 — *Paste your most recent piece of writing.*\n\n"
            "A trade journal entry, a homework essay paragraph, a project brief — "
            "anything you wrote this week that reflects how you think. Just paste it."
        ),
    },
    {
        "key": "goals",
        "prompt": (
            "3/7 — *Your top 3 goals for the next 90 days.*\n\n"
            "Be specific. 'land a finance internship at MD Anderson by Aug 1' "
            "beats 'get a job.' Reply with 3 bullets."
        ),
    },
    {
        "key": "time_sucks",
        "prompt": (
            "4/7 — *What 3 things eat the most of your time but feel low-value?*\n\n"
            "These become automation candidates. List 3."
        ),
    },
    {
        "key": "failed_automations",
        "prompt": (
            "5/7 — *What have you tried to automate that broke or got abandoned?*\n\n"
            "Anything. Honest list — don't worry about looking bad. This shapes what NOT to retry."
        ),
    },
    {
        "key": "manual_kpis",
        "prompt": (
            "6/7 — *What KPIs do you track manually right now?*\n\n"
            "Trade P/L? Savings rate? Workout streak? Habits? Application count? "
            "Anything you check via spreadsheet/Notion/notebook instead of a dashboard."
        ),
    },
    {
        "key": "other_users",
        "prompt": (
            "7/7 — *Who else uses or could use this AIOS?*\n\n"
            "Family? Future business partners? Trading group? Clients (Lucky Dog)? "
            "Helps shape multi-user vs solo design decisions."
        ),
    },
]


# ──────────────────────────────────────────────────────────────────────────
# State persistence
# ──────────────────────────────────────────────────────────────────────────


def state_path(chat_id: int | str) -> Path:
    return STATE_DIR / f"onboard-{chat_id}.json"


def load_state(chat_id: int | str) -> Optional[Dict[str, Any]]:
    path = state_path(chat_id)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def save_state(chat_id: int | str, state: Dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_path(chat_id).write_text(json.dumps(state, indent=2))


def clear_state(chat_id: int | str) -> None:
    path = state_path(chat_id)
    if path.exists():
        path.unlink()


# ──────────────────────────────────────────────────────────────────────────
# Intake document synthesis
# ──────────────────────────────────────────────────────────────────────────


def synthesize_intake(answers: Dict[str, str]) -> str:
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    return textwrap.dedent(f"""\
        ---
        title: AIOS Intake {today}
        tags: [intake, onboard, memory, core]
        created: {today}
        ---

        # 🧭 AIOS Intake — {today}

        > Quarterly snapshot from `/aios-onboard`. Source of truth for "what is
        > the AIOS actually for right now." Re-run every quarter. Outdated intakes
        > drift silently — schedule the next one.

        ## Who you are right now

        {answers.get('identity', '_not answered_')}

        ## How you write & think (sample)

        {answers.get('recent_writing', '_not answered_')}

        ## Top 3 goals (next 90 days)

        {answers.get('goals', '_not answered_')}

        ## Time-sucks (automation candidates)

        {answers.get('time_sucks', '_not answered_')}

        ## Failed / abandoned automations (don't retry blindly)

        {answers.get('failed_automations', '_not answered_')}

        ## Manual KPIs (dashboard candidates)

        {answers.get('manual_kpis', '_not answered_')}

        ## Other users / stakeholders

        {answers.get('other_users', '_not answered_')}

        ---

        ## How the AIOS should adapt to this intake

        Re-read this before:
        - Proposing new scheduled jobs (only justified ones)
        - Adding skills (must serve a goal or kill a time-suck)
        - Designing client-facing flows (account for other users listed above)

        Next intake due: **{_next_quarter(today)}**
    """).strip() + "\n"


def _next_quarter(today_str: str) -> str:
    today = _dt.date.fromisoformat(today_str)
    # Naive: add 90 days. Good enough for a reminder, not a calendar grader.
    next_date = today + _dt.timedelta(days=90)
    return next_date.isoformat()


# ──────────────────────────────────────────────────────────────────────────
# Entry points
# ──────────────────────────────────────────────────────────────────────────


def start(event: Dict[str, Any]) -> Dict[str, Any]:
    """Begin or resume an intake conversation for this chat."""
    chat_id = event.get("chat_id", "default")

    # Allow restart via "/aios-onboard reset"
    text = (event.get("text") or "").strip().lower()
    if "reset" in text or "restart" in text:
        clear_state(chat_id)

    state = load_state(chat_id)
    if state is None:
        state = {"answers": {}, "step": 0, "started": _dt.datetime.now().isoformat()}
        save_state(chat_id, state)

    return ask_next(chat_id, state)


def receive_answer(event: Dict[str, Any]) -> Dict[str, Any]:
    """Persist the latest answer, then ask the next question (or synthesize)."""
    chat_id = event.get("chat_id", "default")
    answer = (event.get("text") or "").strip()

    state = load_state(chat_id)
    if state is None:
        # No active intake — bounce to start
        return start(event)

    step = state["step"]
    if step >= len(QUESTIONS):
        # Already done; just confirm.
        return {"reply": "Intake already complete. Run `/aios-onboard reset` to start over."}

    key = QUESTIONS[step]["key"]
    state["answers"][key] = answer
    state["step"] = step + 1
    save_state(chat_id, state)

    if state["step"] >= len(QUESTIONS):
        return finalize(chat_id, state)

    return ask_next(chat_id, state)


def ask_next(chat_id: int | str, state: Dict[str, Any]) -> Dict[str, Any]:
    step = state["step"]
    if step >= len(QUESTIONS):
        return finalize(chat_id, state)
    q = QUESTIONS[step]
    return {
        "reply": q["prompt"],
        "intake_step": step + 1,
        "intake_total": len(QUESTIONS),
        "next_action": "await_user_answer",
    }


def finalize(chat_id: int | str, state: Dict[str, Any]) -> Dict[str, Any]:
    intake_md = synthesize_intake(state["answers"])
    saved_path: Optional[str] = None

    if vault is not None:
        try:
            saved_path = vault.write(
                folder="AIOS/Memory",
                filename="intake.md",
                content=intake_md,
                mode="overwrite",
            )
            vault.log_activity(
                task="aios-onboard",
                outcome="✅",
                summary="quarterly intake complete (7/7 answered)",
                notes=f"saved={saved_path}",
            )
        except Exception as exc:
            return {
                "reply": f"⚠️ Intake answered but couldn't save to vault: {exc}",
                "intake_md": intake_md,
            }

    clear_state(chat_id)
    return {
        "reply": textwrap.dedent(f"""
            ✅ *Intake complete.*

            Saved to `AIOS/Memory/intake.md`.

            Next intake reminder: 90 days.
            Run `/aios-audit` now to pair this fresh context with a coverage check.
        """).strip(),
        "saved_path": saved_path,
    }
