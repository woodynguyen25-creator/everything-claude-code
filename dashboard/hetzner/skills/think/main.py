"""/think — sequential-thinking scratchpad.

Pattern from AI Masterclass video #20 (Army of Media Agents) and the
sequential-thinking MCP. Forces the model to:
  1. Restate the problem
  2. List what's known + unknown
  3. Generate 3-5 candidate angles
  4. Evaluate each
  5. Pick + explain
  6. Surface the question Woody should ask back

Use when a regular `/triad` is overkill but a one-shot reply would skip
the reasoning Woody wants to see.
"""

from __future__ import annotations

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


THINK_SYSTEM_PROMPT = """\
You are the Thinker. Your job is to make reasoning visible BEFORE the answer.

Always respond in this exact structure (use these markdown headers):

## Problem (restated)
One sentence in your own words.

## Known
- Bullet each load-bearing fact from the request.

## Unknown / assumptions
- Bullet each thing you're assuming or that's missing.

## Angles (3-5)
1. [Name of approach] — one-sentence summary
2. ...

## Evaluation
For each angle: pros / cons / what could break it. Be specific.

## Verdict
The angle you'd take and *why*, in 2-3 sentences. Reference the unknowns
that would change your mind.

## Push back
ONE question Woody should answer that would most change the verdict.

Rules:
- Never skip a section. If empty, write "_(nothing)_".
- No fluff. Bullets > paragraphs.
- This is a thinking surface, not an oracle. Surface tradeoffs honestly.
- Default voice: direct, no motivational language.
"""


def run(event: Dict[str, Any]) -> Dict[str, Any]:
    question = (event.get("text") or "").strip()
    if not question:
        return {"reply": "Usage: `/think <hard question>`"}

    if workers is None:
        return {"reply": "⚠️ shared workers unavailable; can't reach Claude Max"}

    try:
        result = workers.dispatch(
            "claude-max",
            question,
            system=THINK_SYSTEM_PROMPT,
            max_tokens=2_500,
            allow_fallback=True,
        )
    except workers.WorkerError as exc:  # type: ignore[attr-defined]
        return {"reply": f"⚠️ Thinker call failed: {exc}"}

    model_used = result["model"]
    fallback_note = (
        f"\n\n_(fallback: {result['primary_model']} → {model_used})_"
        if result.get("fallback_used")
        else ""
    )
    reply = result["text"] + fallback_note

    if vault is not None:
        try:
            vault.log_activity(
                task="think",
                outcome="✅",
                summary=f"reasoned through: {question[:80]}",
                tokens=result["tokens_in"] + result["tokens_out"],
                cost_usd=result["cost_usd"],
                notes=f"model={model_used} fallback={result.get('fallback_used', False)}",
            )
        except Exception:
            pass

    return {
        "reply": reply,
        "model": model_used,
        "tokens": result["tokens_in"] + result["tokens_out"],
        "fallback_used": result.get("fallback_used", False),
    }
