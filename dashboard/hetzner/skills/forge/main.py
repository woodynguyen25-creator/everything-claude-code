"""/forge — end-to-end Hermes pipeline orchestrator.

Wraps the triad-router with:
  1. Pre-flight readiness check (bridge reachable? DeepSeek capped?)
  2. Triad plan + execution (interrogator → workers → synthesis)
  3. Activity log write with full token + cost summary
  4. Post-flight handoff write (triggers /session-handoff style snapshot)

Use this when Woody wants the AIOS to *just do the thing* end-to-end and
report back. Use /triad when he wants more granular control over the plan.
"""

from __future__ import annotations

import datetime as _dt
import sys
import textwrap
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import vault  # type: ignore
except ImportError:
    vault = None

# triad-router lives in a sibling skill folder; import its module
TRIAD_ROUTER_DIR = Path(__file__).resolve().parent.parent / "triad-router"
if TRIAD_ROUTER_DIR.exists():
    sys.path.insert(0, str(TRIAD_ROUTER_DIR))
try:
    import main as triad  # type: ignore
except ImportError:
    triad = None  # tested without triad-router installed


def preflight() -> Dict[str, Any]:
    """Check infrastructure before forging."""
    issues: List[str] = []
    bridge_ok = vault.bridge_healthy() if vault is not None else False
    if not bridge_ok:
        issues.append("PC bridge unreachable — Codex queue + vault writes may degrade")
    if triad is None:
        issues.append("triad-router not importable — pipeline will skip")
    ds_status = "unknown"
    if triad is not None:
        ds_status = triad.deepseek_status()
        if ds_status == "hard_stop":
            issues.append("DeepSeek hard-stop hit — bulk pieces will reroute to Codex")
    return {
        "bridge_ok": bridge_ok,
        "triad_ok": triad is not None,
        "deepseek_status": ds_status,
        "issues": issues,
    }


def execute_pipeline(request: str) -> Dict[str, Any]:
    """Run the triad pipeline end-to-end."""
    if triad is None:
        return {"error": "triad-router not available"}
    routed = triad.route({"text": request, "mode": "execute"})
    return routed


def render_summary(preflight_data: Dict[str, Any], pipeline: Dict[str, Any]) -> str:
    lines: List[str] = []
    lines.append("🔨 *Forge — Pipeline Result*")
    lines.append("")
    if preflight_data["issues"]:
        lines.append("*Preflight notes:*")
        for issue in preflight_data["issues"]:
            lines.append(f"- {issue}")
        lines.append("")
    if pipeline.get("error"):
        lines.append(f"❌ {pipeline['error']}")
        return "\n".join(lines)
    plan = pipeline.get("execution_plan", {})
    results = pipeline.get("results", [])
    total_cost = pipeline.get("total_cost_usd", 0.0)
    lines.append(f"*Mode:* {plan.get('mode', '?')}")
    lines.append(f"*Pieces executed:* {len(results)}")
    lines.append(f"*Total cost:* ${total_cost:.4f}")
    lines.append("")
    if results:
        lines.append("*Pieces:*")
        for r in results:
            status_icon = {"ok": "✅", "queued_for_pc": "⚠️", "error": "❌"}.get(r.get("status", "?"), "❓")
            lines.append(f"- {status_icon} `{r.get('model', '?')}` — {r.get('piece', '?')[:60]}")
    return "\n".join(lines)


def write_forge_log(request: str, pipeline: Dict[str, Any]) -> str | None:
    """Save a full forge log to vault for later review."""
    if vault is None:
        return None
    ts = _dt.datetime.now().strftime("%Y-%m-%d-%H%M")
    filename = f"forge-{ts}.md"
    plan = pipeline.get("execution_plan", {})
    results = pipeline.get("results", [])

    body = textwrap.dedent(f"""\
        ---
        title: Forge {ts}
        tags: [forge, log, triad]
        created: {ts}
        ---

        # 🔨 Forge — {ts}

        ## Request

        > {request}

        ## Mode

        `{plan.get('mode', '?')}`

        ## Interrogator questions

        """)
    for q in plan.get("questions", []):
        body += f"- {q}\n"
    body += "\n## Pieces executed\n\n"
    for r in results:
        body += f"### {r.get('piece', '?')}\n\n"
        body += f"- **Model:** `{r.get('model', '?')}`\n"
        body += f"- **Status:** {r.get('status', '?')}\n"
        body += f"- **Tokens:** {r.get('tokens_in', 0) + r.get('tokens_out', 0):,}\n"
        body += f"- **Cost:** ${r.get('cost_usd', 0.0):.4f}\n"
        if r.get('text_preview'):
            body += f"\n**Preview:**\n\n> {r['text_preview'][:300]}\n"
        if r.get('error'):
            body += f"\n**Error:** {r['error']}\n"
        body += "\n"

    body += f"\n## Total cost: ${pipeline.get('total_cost_usd', 0.0):.4f}\n"
    try:
        return vault.write("AIOS/Forge", filename, body, mode="overwrite")
    except Exception:
        return None


def run(event: Dict[str, Any]) -> Dict[str, Any]:
    request = (event.get("text") or "").strip()
    if not request:
        return {"reply": "Usage: `/forge <high-level goal you want the AIOS to do end-to-end>`"}

    preflight_data = preflight()
    pipeline = execute_pipeline(request)
    summary = render_summary(preflight_data, pipeline)
    saved_path = write_forge_log(request, pipeline)
    if saved_path:
        summary += f"\n\n*Full log:* `{saved_path}`"

    if vault is not None:
        try:
            total_cost = pipeline.get("total_cost_usd", 0.0)
            piece_count = len(pipeline.get("results", []))
            vault.log_activity(
                task="forge",
                outcome="✅" if not pipeline.get("error") else "❌",
                summary=f"{piece_count} pieces, ${total_cost:.4f}",
                cost_usd=total_cost,
                notes=f"request={request[:80]}",
            )
        except Exception:
            pass

    return {
        "reply": summary,
        "preflight": preflight_data,
        "pipeline": pipeline,
        "forge_log": saved_path,
    }
