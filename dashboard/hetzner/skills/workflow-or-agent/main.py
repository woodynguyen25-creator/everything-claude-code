"""/workflow-or-agent — pre-build decision filter.

Per AI Masterclass video #15 (AI Agents Are Overused) and #34 (6 Months of
Building Agents), most automations should be workflows, not agents. Agents
are non-deterministic, harder to debug, more expensive, less predictable.
Only legitimate agents are systems where:
  - Order of operations truly varies per call
  - Tool selection is genuinely dynamic
  - Multi-step reasoning has no fixed path

This skill scores a proposal on those dimensions and returns a verdict.
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


FILTER_SYSTEM_PROMPT = """\
You are the Workflow-vs-Agent filter for Woody's AIOS.

Given a problem description, score it on three dimensions (each 1-5):

1. **determinism** — How fixed is the order of operations? (1 = totally fixed sequence; 5 = totally varies per call)
2. **tool_variability** — How much does the tool choice change per call? (1 = always same tools; 5 = LLM should pick tools dynamically)
3. **reasoning_depth** — How much chained reasoning is required? (1 = if/then logic; 5 = multi-step planning with branching)

Decision rule:
- Total score ≤ 7  → WORKFLOW (fixed sequence with AI sprinkled in)
- Total score 8-10 → WORKFLOW WITH AI STEPS (mostly fixed, AI does the hard decision points)
- Total score ≥ 11 → AGENT (legitimately needs agent behavior)

Bias hard toward WORKFLOW. Most things people call "agents" online are
actually workflows. If unsure, pick WORKFLOW.

Return ONLY this JSON (no fences, no preamble):
{
  "scores": {"determinism": int, "tool_variability": int, "reasoning_depth": int},
  "total": int,
  "verdict": "WORKFLOW" | "WORKFLOW_WITH_AI_STEPS" | "AGENT",
  "reasoning": "one short paragraph explaining the scores",
  "build_advice": "one short paragraph — what to actually build given the verdict"
}
"""


def evaluate(problem: str) -> Dict[str, Any]:
    if workers is None:
        return {"error": "shared workers unavailable"}
    try:
        result = workers.dispatch(
            "cerebras",
            f"Problem to evaluate:\n\n{problem}",
            system=FILTER_SYSTEM_PROMPT,
            max_tokens=800,
        )
    except workers.WorkerError as exc:  # type: ignore[attr-defined]
        return {"error": str(exc)}

    parsed = _parse_json(result["text"])
    if parsed is None:
        return {"error": "couldn't parse LLM response", "raw": result["text"][:400]}
    parsed["model"] = result["model"]
    parsed["fallback_used"] = result.get("fallback_used", False)
    return parsed


def _parse_json(text: str) -> Dict[str, Any] | None:
    fence = re.search(r"```(?:json)?\s*(.+?)```", text, re.DOTALL)
    body = fence.group(1).strip() if fence else text.strip()
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, dict) or "verdict" not in parsed:
        return None
    return parsed


VERDICT_EMOJI = {
    "WORKFLOW": "🔁",
    "WORKFLOW_WITH_AI_STEPS": "🔀",
    "AGENT": "🧠",
}


def render(evaluation: Dict[str, Any], problem: str) -> str:
    if "error" in evaluation:
        return f"⚠️ Couldn't evaluate: {evaluation['error']}"
    verdict = evaluation["verdict"]
    emoji = VERDICT_EMOJI.get(verdict, "❓")
    scores = evaluation["scores"]
    total = evaluation["total"]
    return (
        f"{emoji} *Verdict: {verdict.replace('_', ' ')}*\n\n"
        f"> {problem[:100]}{'...' if len(problem) > 100 else ''}\n\n"
        f"*Scores ({total}/15):*\n"
        f"• Determinism: {scores['determinism']}/5\n"
        f"• Tool variability: {scores['tool_variability']}/5\n"
        f"• Reasoning depth: {scores['reasoning_depth']}/5\n\n"
        f"*Reasoning:* {evaluation['reasoning']}\n\n"
        f"*Build advice:* {evaluation['build_advice']}"
    )


def run(event: Dict[str, Any]) -> Dict[str, Any]:
    problem = (event.get("text") or "").strip()
    if not problem:
        return {
            "reply": (
                "Usage: `/workflow-or-agent <problem description>`\n\n"
                "Example: `/workflow-or-agent classify incoming emails and "
                "draft replies for the customer service ones`"
            )
        }

    evaluation = evaluate(problem)
    reply = render(evaluation, problem)

    if vault is not None:
        try:
            vault.log_activity(
                task="workflow-or-agent",
                outcome="✅" if "error" not in evaluation else "❌",
                summary=f"{evaluation.get('verdict', 'error')} for: {problem[:60]}",
                notes=f"model={evaluation.get('model', '?')}",
            )
        except Exception:
            pass

    return {"reply": reply, "evaluation": evaluation, "problem": problem}
