"""/route — auto-route any Telegram message.

Pipeline:
  1. Run /classify on the message to get a tier + recommended skill
  2. Branch on tier:
       urgent        → quick action plan + tag Woody
       action        → suggest the /triad invocation with prefilled prompt
       informational → save to vault inbox + ack
       noise         → silent ack
  3. Append a row to the activity log

This is the "fire and forget" entrypoint when Woody doesn't want to think
about which skill to invoke.
"""

from __future__ import annotations

import datetime as _dt
import sys
from pathlib import Path
from typing import Any, Dict

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import vault  # type: ignore
except ImportError:
    vault = None

# Import the classifier directly so we don't double-go-through-the-bridge
CLASSIFY_DIR = Path(__file__).resolve().parent.parent / "inbox-classify"
if CLASSIFY_DIR.exists():
    sys.path.insert(0, str(CLASSIFY_DIR))
try:
    import main as classifier  # type: ignore
except ImportError:
    classifier = None


def save_to_inbox(message: str) -> str | None:
    if vault is None:
        return None
    ts = _dt.datetime.now().strftime("%Y-%m-%d-%H%M%S")
    filename = f"intake-{ts}.md"
    body = (
        f"---\n"
        f"title: Intake {ts}\n"
        f"tags: [inbox, intake, telegram]\n"
        f"created: {_dt.datetime.now().isoformat(timespec='seconds')}\n"
        f"source: telegram-intake-route\n"
        f"---\n\n"
        f"# 📥 Intake {ts}\n\n"
        f"{message}\n"
    )
    try:
        return vault.write("_inbox", filename, body, mode="create")
    except Exception:
        return None


def render_urgent(message: str, classification: Dict[str, Any]) -> str:
    return (
        f"🚨 *URGENT — needs action now*\n\n"
        f"> {message[:200]}\n\n"
        f"*Why urgent:* {classification.get('reason', '?')}\n\n"
        f"*Quick action:*\n"
        f"- Acknowledge in this chat with one-line plan\n"
        f"- If trading-related: pull live quote via Trading Assistant\n"
        f"- If deadline-driven: check Internship deadlines / homework calendar\n\n"
        f"_Recommended next: `{classification.get('recommended_skill', '/aios-status')}`_"
    )


def render_action(message: str, classification: Dict[str, Any]) -> str:
    rec = classification.get("recommended_skill", "/triad")
    return (
        f"📋 *ACTION — suggested invocation*\n\n"
        f"> {message[:200]}\n\n"
        f"*Why action:* {classification.get('reason', '?')}\n\n"
        f"Run this when ready:\n"
        f"```\n{rec} {message[:300]}\n```\n\n"
        f"_Confidence: {int(classification.get('confidence', 0) * 100)}%_"
    )


def render_informational(message: str, classification: Dict[str, Any], saved_path: str | None) -> str:
    where = f"`{saved_path}`" if saved_path else "_inbox (couldn't save)"
    return (
        f"📥 *INFORMATIONAL — captured*\n\n"
        f"> {message[:160]}\n\n"
        f"Saved to {where}\n\n"
        f"_Process later with `/inbox` (when it exists) or sort manually._"
    )


def render_noise() -> str:
    return "🗑️ Ack — looks like noise, ignored."


def run(event: Dict[str, Any]) -> Dict[str, Any]:
    message = (event.get("text") or "").strip()
    if not message:
        return {"reply": "Usage: `/route <message to route>`"}

    if classifier is None:
        return {"reply": "⚠️ /classify skill not installed; can't route"}

    classification = classifier.classify(message)
    tier = classification.get("tier", "informational")

    saved_path: str | None = None
    if tier == "urgent":
        reply = render_urgent(message, classification)
    elif tier == "action":
        reply = render_action(message, classification)
    elif tier == "informational":
        saved_path = save_to_inbox(message)
        reply = render_informational(message, classification, saved_path)
    else:  # noise
        reply = render_noise()

    if vault is not None:
        try:
            vault.log_activity(
                task="intake-route",
                outcome="✅",
                summary=f"tier={tier} → {classification.get('recommended_skill', '?')}",
                notes=f"saved={saved_path}" if saved_path else "",
            )
        except Exception:
            pass

    return {
        "reply": reply,
        "tier": tier,
        "classification": classification,
        "saved_path": saved_path,
    }
