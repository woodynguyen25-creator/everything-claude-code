"""Hermes Triad Router v0.3 — cost-aware multi-model orchestrator.

v0.1: visible plan.
v0.2: wired real worker dispatchers (Claude Max, Codex via dashboard, DeepSeek,
      Cerebras, Groq, Gemini Flash) + quad-mode critique loops.
v0.3: Interrogator + Decomposer now call Claude Max directly instead of using
      keyword heuristics. The result is genuinely smart plans — model-chosen
      questions and per-piece capability tags, with the heuristic path kept as
      a fallback when Claude Max is unreachable.

The Thinker pattern (locked 2026-05-24):
  1. Interrogator runs first (heavy clarifying questions, no cap).
  2. Decomposes the request into discrete pieces.
  3. Routes each piece to the optimal model considering capability + cost.
  4. Surfaces a visible execution plan before any worker runs.
  5. Tracks DeepSeek daily spend; reroutes to Codex (PC queue) when cap hits.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

# Allow `from _shared import vault, models` when installed at ~/.hermes/skills/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import models as workers  # type: ignore
    from _shared import vault              # type: ignore
except ImportError:
    workers = None  # tests can run without _shared on sys.path
    vault = None

DEEPSEEK_SOFT_WARN = 0.50  # USD
DEEPSEEK_HARD_STOP = 1.50  # USD
SPEND_STATE_PATH = Path(
    os.environ.get(
        "TRIAD_SPEND_STATE",
        "/home/hermes/.hermes/state/triad-daily-spend.json",
    )
)


# ──────────────────────────────────────────────────────────────────────────
# Spend tracking (unchanged from v0.1 — proven stable)
# ──────────────────────────────────────────────────────────────────────────

def _today_key() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%d")


def load_daily_spend() -> Dict[str, float]:
    if not SPEND_STATE_PATH.exists():
        return {}
    try:
        data: Dict[str, Any] = json.loads(SPEND_STATE_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return {}
    if data.get("date") != _today_key():
        return {}
    spend = data.get("spend", {})
    return {k: float(v) for k, v in spend.items() if isinstance(v, (int, float))}


def add_spend(provider: str, usd: float) -> Dict[str, float]:
    SPEND_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    current = load_daily_spend()
    current[provider] = current.get(provider, 0.0) + usd
    SPEND_STATE_PATH.write_text(
        json.dumps({"date": _today_key(), "spend": current}, indent=2)
    )
    return current


def deepseek_status() -> str:
    spent = load_daily_spend().get("deepseek", 0.0)
    if spent >= DEEPSEEK_HARD_STOP:
        return "hard_stop"
    if spent >= DEEPSEEK_SOFT_WARN:
        return "soft_warn"
    return "ok"


# ──────────────────────────────────────────────────────────────────────────
# Capability → Model
# ──────────────────────────────────────────────────────────────────────────

CAPABILITY_TO_MODEL: Dict[str, str] = {
    "synthesis":   "claude-max",
    "code":        "codex",            # routed to PC queue (no live worker yet)
    "bulk":        "deepseek",
    "scan":        "cerebras",
    "critique":    "gemini-flash",
    "interrogate": "claude-max",
}

MODEL_COST_SHAPE: Dict[str, str] = {
    "claude-max":   "flat-subscription",
    "codex":        "flat-subscription (PC-only)",
    "deepseek":     "metered",
    "cerebras":     "free",
    "groq":         "free",
    "gemini-flash": "free",
}


@dataclass
class Piece:
    description: str
    capability: str
    estimated_tokens: int = 1_000
    notes: str = ""
    prompt: Optional[str] = None  # filled by Decomposer; consumed by execute_piece

    def assigned_model(self) -> str:
        model = CAPABILITY_TO_MODEL.get(self.capability, "claude-max")
        if model == "deepseek" and deepseek_status() == "hard_stop":
            return "codex"
        return model


@dataclass
class Plan:
    forging: str
    pieces: List[Piece] = field(default_factory=list)
    mode: str = "triad"
    questions: List[str] = field(default_factory=list)

    def render(self) -> str:
        lines: List[str] = []
        lines.append(f"## Execution plan ({self.mode})")
        lines.append("")
        if self.questions:
            lines.append("### Interrogator first asks:")
            for i, q in enumerate(self.questions, 1):
                lines.append(f"{i}. {q}")
            lines.append("")
        lines.append("### Routing")
        lines.append("| # | Piece | Model | Cost shape | Notes |")
        lines.append("|---|---|---|---|---|")
        for i, p in enumerate(self.pieces, 1):
            model = p.assigned_model()
            shape = MODEL_COST_SHAPE.get(model, "?")
            note = p.notes or "—"
            lines.append(f"| {i} | {p.description} | `{model}` | {shape} | {note} |")
        spent = load_daily_spend().get("deepseek", 0.0)
        status = deepseek_status()
        lines.append("")
        lines.append(
            f"_DeepSeek spend today: ${spent:.2f} — status `{status}` "
            f"(soft ${DEEPSEEK_SOFT_WARN:.2f}, hard ${DEEPSEEK_HARD_STOP:.2f})_"
        )
        if self.mode == "quad":
            lines.append("")
            lines.append("_Quad mode: up to 3 critique loops, cross-family critics per pass._")
        return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────────────
# Interrogator + Decomposer
# ──────────────────────────────────────────────────────────────────────────

INTERROGATOR_SYSTEM_PROMPT = """\
You are the Interrogator for Woody's AIOS. Before any worker model touches the
request, you surface the 3-7 most load-bearing clarifying questions.

Rules:
- Specific > generic. "What ticker and expiry?" beats "what details?"
- One question per ambiguity. Don't bundle.
- Score each ambiguity on (scope, success criteria, constraints, integrations,
  deadline). Only ask about the ones the request leaves genuinely unclear.
- Skip the question if the request answers it.
- Return ONLY a numbered list of questions. No preamble, no closing remarks.
- 3-7 questions max. Fewer is fine when the request is already clear.
"""


def interrogate(request: str) -> List[str]:
    """Generate clarifying questions via Claude Max; fall back to heuristics."""
    if workers is not None:
        try:
            result = workers.call_claude_max(
                f"REQUEST:\n{request}\n\nQuestions:",
                system=INTERROGATOR_SYSTEM_PROMPT,
                max_tokens=800,
            )
            questions = _parse_numbered_list(result["text"])
            if questions:
                return questions[:7]
        except Exception:
            pass  # fall through to heuristic
    return _interrogate_heuristic(request)


def _interrogate_heuristic(request: str) -> List[str]:
    """Fallback when Claude Max is unreachable."""
    questions: List[str] = []
    lowered = request.lower()
    if "deadline" not in lowered and "by " not in lowered:
        questions.append("When does this need to be done? (deadline or 'no rush')")
    if "deliver" not in lowered and "output" not in lowered:
        questions.append("What's the concrete deliverable — a file? a Telegram reply? a vault note?")
    if "scope" not in lowered and "just" not in lowered:
        questions.append("Is this a one-shot or a recurring pattern worth codifying?")
    if any(word in lowered for word in ["maybe", "or", "either"]):
        questions.append("You hedged on the approach — which direction wins?")
    if not questions:
        questions.append("Anything obvious you'd want me to push back on before I start?")
    return questions


def _parse_numbered_list(text: str) -> List[str]:
    """Extract '1. foo' / '2) bar' / '- baz' style lines from an LLM response."""
    items: List[str] = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        # Strip leading "N." / "N)" / "-" / "*"
        stripped = line
        for prefix_pattern in (r"^\d+\.\s+", r"^\d+\)\s+", r"^[-*]\s+"):
            import re as _re
            m = _re.match(prefix_pattern, stripped)
            if m:
                stripped = stripped[m.end():]
                break
        if stripped and stripped != line:
            items.append(stripped)
    return items


DECOMPOSER_SYSTEM_PROMPT = """\
You are the Decomposer for Woody's AIOS. Given a request, break it into 2-5
concrete pieces of work. Each piece gets routed to a specific model.

Available capabilities (use these tags exactly):
- "scan"        — fast fact-gathering, extraction, lookups (Cerebras free)
- "code"        — implementation, refactor, code generation (Codex flat)
- "bulk"        — large generation, long context, batch (DeepSeek metered)
- "critique"    — adversarial review, find flaws (Gemini Flash free)
- "synthesis"   — final writeup, integration, taste (Claude Max flat)

Rules:
- Skip capabilities that don't apply. Most requests need 2-3 pieces, not 5.
- "synthesis" usually finishes the chain. "scan" usually starts (if needed).
- Don't include "interrogate" — that's handled separately.
- Each piece needs: a one-line description AND a capability tag.
- Be concrete about what each piece produces, not how.

Return ONLY a JSON array — no markdown, no preamble. Schema:
[
  {"description": "...", "capability": "scan|code|bulk|critique|synthesis", "estimated_tokens": 3000, "notes": "optional"}
]
"""


def decompose(request: str) -> List[Piece]:
    """Decompose via Claude Max; fall back to heuristic."""
    pieces: List[Piece] = []
    # Interrogator step is implicit — handled by route() before workers run.
    pieces.append(Piece(
        description="Run Interrogator + finalize scope",
        capability="interrogate",
        estimated_tokens=2_000,
        notes="Synchronous; no parallel work until answered",
        prompt=None,
    ))

    llm_pieces = _decompose_via_claude(request)
    if llm_pieces:
        pieces.extend(llm_pieces)
    else:
        pieces.extend(_decompose_heuristic(request))

    return pieces


def _decompose_via_claude(request: str) -> List[Piece]:
    """Ask Claude Max for a decomposition. Returns [] on any failure."""
    if workers is None:
        return []
    try:
        result = workers.call_claude_max(
            f"REQUEST:\n{request}\n\nReturn pieces:",
            system=DECOMPOSER_SYSTEM_PROMPT,
            max_tokens=1_500,
        )
        return _parse_pieces_json(result["text"], request)
    except Exception:
        return []


def _parse_pieces_json(text: str, request: str) -> List[Piece]:
    """Parse Claude's JSON array response. Tolerates code-fence wrapping."""
    import json as _json
    import re as _re
    # Strip ```json ... ``` fences if present
    fenced = _re.search(r"```(?:json)?\s*(.+?)```", text, _re.DOTALL)
    body = fenced.group(1).strip() if fenced else text.strip()
    try:
        data = _json.loads(body)
    except _json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []

    valid_capabilities = {"scan", "code", "bulk", "critique", "synthesis"}
    pieces: List[Piece] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        cap = str(item.get("capability", "")).lower().strip()
        if cap not in valid_capabilities:
            continue
        desc = str(item.get("description", "")).strip()
        if not desc:
            continue
        pieces.append(Piece(
            description=desc[:200],
            capability=cap,
            estimated_tokens=int(item.get("estimated_tokens", 3_000)),
            notes=str(item.get("notes", ""))[:200],
            prompt=_build_piece_prompt(cap, desc, request),
        ))
    return pieces


def _build_piece_prompt(capability: str, description: str, request: str) -> str:
    """Wrap each piece's description in a capability-specific prompt template."""
    if capability == "scan":
        return f"Scan and surface key facts for this:\n{request}\n\nTask: {description}"
    if capability == "code":
        return f"Implementation request:\n{request}\n\nThis piece: {description}"
    if capability == "bulk":
        return f"Bulk generation:\n{request}\n\nThis piece: {description}"
    if capability == "critique":
        return f"Critique adversarially:\n{request}\n\nFocus: {description}"
    if capability == "synthesis":
        return f"Synthesize the prior work into a final reply.\n\nOriginal request: {request}\n\nThis piece: {description}"
    return description


def _decompose_heuristic(request: str) -> List[Piece]:
    """Fallback decomposer when Claude Max is unreachable."""
    lowered = request.lower()
    pieces: List[Piece] = []

    if any(word in lowered for word in ["research", "summarize", "scan", "find"]):
        pieces.append(Piece(
            description="Initial scan / fact-gathering",
            capability="scan",
            estimated_tokens=3_000,
            notes="Cerebras free tier",
            prompt=f"Scan and summarize key facts for: {request}",
        ))
    if any(word in lowered for word in ["build", "implement", "code", "refactor", "fix"]):
        pieces.append(Piece(
            description="Implement the change",
            capability="code",
            estimated_tokens=8_000,
            notes="Codex via dashboard",
            prompt=f"Implement: {request}",
        ))
    if any(word in lowered for word in ["bulk", "many", "all", "batch", "generate"]):
        pieces.append(Piece(
            description="Bulk generation pass",
            capability="bulk",
            estimated_tokens=20_000,
            notes="DeepSeek metered (auto-reroute at cap)",
            prompt=f"Bulk generate per: {request}",
        ))
    if "critique" in lowered or "review" in lowered:
        pieces.append(Piece(
            description="Critique pass (different-family model)",
            capability="critique",
            estimated_tokens=4_000,
            notes="Gemini Flash free",
            prompt=f"Critique this approach for: {request}",
        ))

    pieces.append(Piece(
        description="Synthesize results + write Telegram reply",
        capability="synthesis",
        estimated_tokens=2_000,
        notes="Claude Max — flat subscription",
        prompt=None,
    ))
    return pieces


def detect_mode(request: str) -> str:
    lowered = request.lower()
    if any(word in lowered for word in ["ultrathink", "deep dive", "critique heavily", "quad"]):
        return "quad"
    return "triad"


# ──────────────────────────────────────────────────────────────────────────
# v0.2: Live worker dispatch
# ──────────────────────────────────────────────────────────────────────────


@dataclass
class PieceResult:
    piece_description: str
    model: str
    text: str
    tokens_in: int
    tokens_out: int
    cost_usd: float
    status: str  # "ok" | "queued_for_pc" | "error"
    error: Optional[str] = None


def execute_piece(piece: Piece, context: str = "") -> PieceResult:
    """Dispatch a single piece to its assigned worker."""
    model = piece.assigned_model()

    if workers is None:
        return PieceResult(
            piece_description=piece.description,
            model=model,
            text="",
            tokens_in=0,
            tokens_out=0,
            cost_usd=0.0,
            status="error",
            error="_shared.models not importable (running outside Hermes env)",
        )

    prompt = piece.prompt or piece.description
    if context:
        prompt = f"{context}\n\n---\n\n{prompt}"

    try:
        result = workers.dispatch(model, prompt)
    except workers.WorkerError as exc:  # type: ignore[attr-defined]
        # Codex-via-bridge errors usually mean PC is off — treat as queued.
        if model == "codex" and "PC off" in str(exc):
            return PieceResult(
                piece_description=piece.description,
                model="codex",
                text="[QUEUED FOR PC — codex bridge unreachable, retry when PC online]",
                tokens_in=0,
                tokens_out=0,
                cost_usd=0.0,
                status="queued_for_pc",
                error=str(exc),
            )
        return PieceResult(
            piece_description=piece.description,
            model=model,
            text="",
            tokens_in=0,
            tokens_out=0,
            cost_usd=0.0,
            status="error",
            error=str(exc),
        )

    # Track metered spend
    if result["cost_usd"] > 0:
        add_spend(model, result["cost_usd"])

    return PieceResult(
        piece_description=piece.description,
        model=model,
        text=result["text"],
        tokens_in=result["tokens_in"],
        tokens_out=result["tokens_out"],
        cost_usd=result["cost_usd"],
        status="ok",
    )


QUAD_MAX_LOOPS = 3
QUAD_CRITIC_ROTATION: List[str] = ["gemini-flash", "cerebras", "groq"]


def _log_piece(piece: Piece, result: PieceResult, loop_index: int = 0) -> None:
    """Append a row to AIOS-ACTIVITY-LOG for one piece execution. Best-effort."""
    if vault is None:
        return
    try:
        outcome = {"ok": "✅", "queued_for_pc": "⚠️", "error": "❌"}[result.status]
        prefix = f"L{loop_index} " if loop_index else ""
        summary = f"{prefix}piece={piece.description[:70]} model={result.model}"
        vault.log_activity(
            task="triad-router",
            outcome=outcome,
            summary=summary,
            tokens=result.tokens_in + result.tokens_out,
            cost_usd=result.cost_usd,
            notes=result.error or "",
        )
    except Exception:
        pass


def execute_plan(plan: Plan) -> List[PieceResult]:
    """Execute every non-interrogator piece in order.

    Triad mode: one pass, plus one optional critique pass (Gemini).
    Quad mode: same first pass, then up to 3 critique loops with rotating
    cross-family critics. Each loop critiques the previous synthesis output
    and feeds back into another synthesis pass.
    """
    results: List[PieceResult] = []
    rolling_context = ""

    # ──────────────────── First pass: standard pieces ────────────────────
    last_synthesis_text = ""
    for piece in plan.pieces:
        if piece.capability == "interrogate":
            continue
        result = execute_piece(piece, context=rolling_context)
        results.append(result)
        if result.status == "ok" and result.text:
            rolling_context = (rolling_context + "\n\n" + result.text)[-8_000:]
            if piece.capability == "synthesis":
                last_synthesis_text = result.text
        _log_piece(piece, result)

    # ──────────────────── Quad-mode critique loops ──────────────────────
    if plan.mode != "quad" or not last_synthesis_text:
        return results

    for loop_index in range(1, QUAD_MAX_LOOPS + 1):
        critic_model = QUAD_CRITIC_ROTATION[(loop_index - 1) % len(QUAD_CRITIC_ROTATION)]
        critique_piece = Piece(
            description=f"Quad loop {loop_index} — critique (model={critic_model})",
            capability="critique",
            estimated_tokens=2_000,
            notes=f"Quad iteration {loop_index}/{QUAD_MAX_LOOPS}",
            prompt=(
                "You are an adversarial critic. Read the current synthesis below "
                "and return ONLY the 3 most load-bearing flaws or missed angles. "
                "Be specific and structural — not stylistic. If it's already "
                "strong, say so in one sentence and stop.\n\n"
                f"---\nCURRENT SYNTHESIS:\n{last_synthesis_text}\n---\n"
            ),
        )
        # Bypass capability-table; force the critic model directly
        if workers is not None:
            try:
                worker_result = workers.dispatch(critic_model, critique_piece.prompt or "")
                critique_result = PieceResult(
                    piece_description=critique_piece.description,
                    model=critic_model,
                    text=worker_result["text"],
                    tokens_in=worker_result["tokens_in"],
                    tokens_out=worker_result["tokens_out"],
                    cost_usd=worker_result["cost_usd"],
                    status="ok",
                )
            except workers.WorkerError as exc:  # type: ignore[attr-defined]
                critique_result = PieceResult(
                    piece_description=critique_piece.description,
                    model=critic_model,
                    text="",
                    tokens_in=0,
                    tokens_out=0,
                    cost_usd=0.0,
                    status="error",
                    error=str(exc),
                )
        else:
            critique_result = PieceResult(
                piece_description=critique_piece.description,
                model=critic_model,
                text="",
                tokens_in=0,
                tokens_out=0,
                cost_usd=0.0,
                status="error",
                error="_shared.models not importable",
            )
        results.append(critique_result)
        _log_piece(critique_piece, critique_result, loop_index)

        if critique_result.status != "ok" or not critique_result.text:
            break

        # Early-exit when the critic says it's already strong
        lower = critique_result.text.lower()
        if "already strong" in lower or "no significant" in lower or "no notable" in lower:
            break

        # Re-synthesize incorporating the critique
        resynth_piece = Piece(
            description=f"Quad loop {loop_index} — re-synthesis",
            capability="synthesis",
            estimated_tokens=2_000,
            notes=f"Quad iteration {loop_index}/{QUAD_MAX_LOOPS}",
            prompt=(
                "Revise the prior synthesis using the critique below. Keep what "
                "still holds; rewrite what doesn't; explicitly address each flaw "
                "the critic surfaced.\n\n"
                f"PRIOR SYNTHESIS:\n{last_synthesis_text}\n\n"
                f"CRITIQUE:\n{critique_result.text}\n"
            ),
        )
        resynth_result = execute_piece(resynth_piece, context="")
        results.append(resynth_result)
        _log_piece(resynth_piece, resynth_result, loop_index)
        if resynth_result.status == "ok" and resynth_result.text:
            last_synthesis_text = resynth_result.text

    return results


# ──────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────

def route(event: Dict[str, Any]) -> Dict[str, Any]:
    """Hermes entry point.

    event["text"]: str  the Forging request
    event["chat_id"]: int
    event["mode"]: "plan_only" | "execute" (default "plan_only")
    """
    request = event.get("text", "").strip()
    if not request:
        return {"reply": "Triad router got an empty request. Try `/triad <what you want>`."}

    mode_arg = event.get("mode", "plan_only")
    triad_mode = detect_mode(request)
    questions = interrogate(request)
    pieces = decompose(request)
    plan = Plan(forging=request, pieces=pieces, mode=triad_mode, questions=questions)

    payload: Dict[str, Any] = {
        "reply": plan.render(),
        "execution_plan": {
            "forging": request,
            "mode": triad_mode,
            "questions": questions,
            "pieces": [
                {
                    "description": p.description,
                    "capability": p.capability,
                    "model": p.assigned_model(),
                    "estimated_tokens": p.estimated_tokens,
                    "notes": p.notes,
                }
                for p in pieces
            ],
        },
        "deepseek_status": deepseek_status(),
        "next_action": "answer_questions" if mode_arg == "plan_only" else "execution_results_attached",
    }

    if mode_arg == "execute":
        results = execute_plan(plan)
        payload["results"] = [
            {
                "piece": r.piece_description,
                "model": r.model,
                "status": r.status,
                "tokens_in": r.tokens_in,
                "tokens_out": r.tokens_out,
                "cost_usd": r.cost_usd,
                "text_preview": r.text[:300] if r.text else "",
                "error": r.error,
            }
            for r in results
        ]
        payload["total_cost_usd"] = sum(r.cost_usd for r in results)

    return payload
