"""/aios-status — quick on-demand health check.

Hits everything Woody might want to know in one Telegram reply:
  - PC bridge reachable?
  - DeepSeek spend today (with cap status)
  - Latest scheduled-job runs from the activity log
  - Idle automations
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import vault  # type: ignore
except ImportError:
    vault = None

SPEND_STATE_PATH = Path(
    os.environ.get(
        "TRIAD_SPEND_STATE",
        "/home/hermes/.hermes/state/triad-daily-spend.json",
    )
)
DEEPSEEK_SOFT = 0.50
DEEPSEEK_HARD = 1.50


def deepseek_spend_today() -> Dict[str, Any]:
    if not SPEND_STATE_PATH.exists():
        return {"spent": 0.0, "status": "ok"}
    try:
        data = json.loads(SPEND_STATE_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return {"spent": 0.0, "status": "ok"}
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    if data.get("date") != today:
        return {"spent": 0.0, "status": "ok"}
    spent = float(data.get("spend", {}).get("deepseek", 0.0))
    if spent >= DEEPSEEK_HARD:
        status = "hard_stop"
    elif spent >= DEEPSEEK_SOFT:
        status = "soft_warn"
    else:
        status = "ok"
    return {"spent": spent, "status": status}


def recent_activity_rows(limit: int = 5) -> List[Dict[str, str]]:
    if vault is None:
        return []
    try:
        content = vault.read("AIOS", "AIOS-ACTIVITY-LOG.md")
    except Exception:
        return []
    rows: List[Dict[str, str]] = []
    for line in content.split("\n"):
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.split("|")]
        # Skip header rows (no ISO timestamp in col 1)
        if len(cols) < 8 or not re.match(r"^\d{4}-\d{2}-\d{2}T", cols[1]):
            continue
        rows.append({
            "timestamp": cols[1],
            "task": cols[2],
            "outcome": cols[3],
            "summary": cols[4][:80],
        })
    rows.sort(key=lambda r: r["timestamp"], reverse=True)
    return rows[:limit]


def render(spend: Dict[str, Any], recent: List[Dict[str, str]], bridge_ok: bool) -> str:
    lines: List[str] = []
    lines.append("🛰️ *AIOS Status*")
    lines.append("")
    lines.append(f"PC bridge: {'✅ healthy' if bridge_ok else '❌ unreachable'}")
    lines.append(
        f"DeepSeek today: ${spend['spent']:.2f} ({spend['status']}; "
        f"soft ${DEEPSEEK_SOFT:.2f} / hard ${DEEPSEEK_HARD:.2f})"
    )
    lines.append("")
    if recent:
        lines.append("*Last 5 task runs:*")
        for r in recent:
            short_ts = r["timestamp"][5:16].replace("T", " ")
            lines.append(f"- `{short_ts}` {r['outcome']} {r['task']} — {r['summary']}")
    else:
        lines.append("_No activity log rows found yet._")
    return "\n".join(lines)


def status(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    bridge_ok = vault.bridge_healthy() if vault is not None else False
    spend = deepseek_spend_today()
    recent = recent_activity_rows(5)
    reply = render(spend, recent, bridge_ok)

    if vault is not None:
        try:
            vault.log_activity(
                task="aios-status",
                outcome="✅",
                summary=f"bridge={'up' if bridge_ok else 'down'} ds=${spend['spent']:.2f}",
            )
        except Exception:
            pass

    return {"reply": reply, "bridge_ok": bridge_ok, "deepseek": spend, "recent": recent}
