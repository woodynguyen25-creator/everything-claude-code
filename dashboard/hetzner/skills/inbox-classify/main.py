"""/classify — 4-tier message classifier.

Pattern from AI Masterclass video #17 (Zero to Inbox Agent).

Tiers:
  - urgent       — act NOW (market move, deadline today, family thing)
  - action       — todo for AIOS (build X, schedule Y, follow up Z)
  - informational — capture, no action needed (interesting fact, idea)
  - noise        — ignore (typo, accidental send, spam-like)

Uses Cerebras (free, fast) for classification. Returns the tier + a one-line
reason + recommended downstream skill. Read-only routing — does NOT auto-fire
the recommended skill (Woody approves before action).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import models as workers  # type: ignore
    from _shared import vault              # type: ignore
except ImportError:
    workers = None
    vault = None


CLASSIFIER_SYSTEM_PROMPT = """\
You are the Inbox Classifier for Woody's AIOS. Classify each message into
exactly ONE tier and recommend ONE downstream skill.

Tiers:
- "urgent"       — needs action in the next hour (market move, deadline today, family)
- "action"       — todo for the AIOS (build X, schedule Y, research Z)
- "informational" — capture, no action (idea, link, observation)
- "noise"        — ignore (typo, accidental send, repeated content)

Available downstream skills:
- /triad <forging>          — execute multi-piece work
- /think <question>         — reason through hard question
- /aios-audit               — coverage audit
- /aios-status              — health check
- /codify-workflow          — propose new skills from recent activity
- /session-handoff          — snapshot current state
- /md-ingest <url>          — ingest external doc
- /morning-brief            — today's brief
- /aios-help                — list skills
- voice-note (no command)   — voice memo routing
- _save_to_inbox            — informational capture, no skill needed

Return ONLY this JSON (no markdown, no fences):
{
  "tier": "urgent|action|informational|noise",
  "reason": "one short sentence — why this tier",
  "recommended_skill": "string from the list above OR _save_to_inbox OR _ignore",
  "confidence": 0.0-1.0
}
"""


def classify(message: str) -> Dict[str, Any]:
    """Ask Cerebras for a classification. Heuristic fallback."""
    if workers is not None:
        try:
            result = workers.dispatch(
                "cerebras",
                f"Message to classify:\n\n{message}",
                system=CLASSIFIER_SYSTEM_PROMPT,
                max_tokens=300,
            )
            parsed = _parse_classification_json(result["text"])
            if parsed:
                parsed["model"] = result["model"]
                parsed["fallback_used"] = result.get("fallback_used", False)
                return parsed
        except Exception:
            pass
    return _heuristic_classify(message)


def _parse_classification_json(text: str) -> Dict[str, Any] | None:
    fence = re.search(r"```(?:json)?\s*(.+?)```", text, re.DOTALL)
    body = fence.group(1).strip() if fence else text.strip()
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, dict):
        return None
    tier = str(parsed.get("tier", "")).lower()
    if tier not in {"urgent", "action", "informational", "noise"}:
        return None
    return {
        "tier": tier,
        "reason": str(parsed.get("reason", ""))[:200],
        "recommended_skill": str(parsed.get("recommended_skill", "_save_to_inbox"))[:80],
        "confidence": float(parsed.get("confidence", 0.5)),
    }


URGENT_KEYWORDS = ("urgent", "now", "asap", "emergency", "right now", "immediately")
ACTION_KEYWORDS = ("build", "create", "make", "schedule", "research", "plan", "implement", "fix", "/triad", "/think")
NOISE_KEYWORDS = ("oops", "ignore", "nvm", "nevermind", "test")


def _heuristic_classify(message: str) -> Dict[str, Any]:
    lowered = message.lower()
    if any(k in lowered for k in URGENT_KEYWORDS):
        return {
            "tier": "urgent",
            "reason": "keyword match — sounds time-critical",
            "recommended_skill": "/aios-status",
            "confidence": 0.4,
            "model": "heuristic",
            "fallback_used": False,
        }
    if any(k in lowered for k in NOISE_KEYWORDS):
        return {
            "tier": "noise",
            "reason": "keyword match — looks accidental",
            "recommended_skill": "_ignore",
            "confidence": 0.4,
            "model": "heuristic",
            "fallback_used": False,
        }
    if any(k in lowered for k in ACTION_KEYWORDS) or message.strip().startswith("/"):
        return {
            "tier": "action",
            "reason": "keyword match — sounds like a todo",
            "recommended_skill": "/triad",
            "confidence": 0.4,
            "model": "heuristic",
            "fallback_used": False,
        }
    return {
        "tier": "informational",
        "reason": "no action keywords detected",
        "recommended_skill": "_save_to_inbox",
        "confidence": 0.3,
        "model": "heuristic",
        "fallback_used": False,
    }


def render_reply(classification: Dict[str, Any], message: str) -> str:
    tier_emoji = {
        "urgent": "🚨",
        "action": "📋",
        "informational": "📥",
        "noise": "🗑️",
    }.get(classification["tier"], "❓")

    short_msg = message[:80] + "..." if len(message) > 80 else message
    confidence_pct = int(classification["confidence"] * 100)

    return (
        f"{tier_emoji} *{classification['tier'].upper()}* "
        f"({confidence_pct}% conf · {classification['model']})\n\n"
        f"> {short_msg}\n\n"
        f"*Reason:* {classification['reason']}\n"
        f"*Recommended:* `{classification['recommended_skill']}`"
    )


def run(event: Dict[str, Any]) -> Dict[str, Any]:
    message = (event.get("text") or "").strip()
    if not message:
        return {"reply": "Usage: `/classify <message to classify>`"}

    classification = classify(message)
    reply = render_reply(classification, message)

    if vault is not None:
        try:
            vault.log_activity(
                task="inbox-classify",
                outcome="✅",
                summary=f"{classification['tier']} ({classification['confidence']:.2f})",
                notes=f"model={classification['model']} → {classification['recommended_skill']}",
            )
        except Exception:
            pass

    return {
        "reply": reply,
        **classification,
    }
