"""/session-handoff — Hermes-side snapshot.

NOT the same as Claude Code's /handoff. This one runs on the Droplet,
aggregates Hermes-visible state (activity log, spend, voice fallbacks,
cron jobs), and writes a BATON-style note to AIOS/Handoffs/.

Use when:
  - About to step away and want the AIOS to summarize itself
  - Want a clean snapshot before kicking off a long autonomous run
  - Investigating "what's actually happening right now?"
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import re
import sys
import textwrap
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import vault  # type: ignore
except ImportError:
    vault = None

HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/home/hermes/.hermes"))
JOBS_FILE = HERMES_HOME / "jobs.json"
SPEND_FILE = HERMES_HOME / "state" / "triad-daily-spend.json"


def today_activity_rows() -> List[Dict[str, str]]:
    if vault is None:
        return []
    try:
        content = vault.read("AIOS", "AIOS-ACTIVITY-LOG.md")
    except Exception:
        return []
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    rows: List[Dict[str, str]] = []
    for line in content.split("\n"):
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.split("|")]
        if len(cols) < 8 or not cols[1].startswith(today):
            continue
        if not re.match(r"^\d{4}-\d{2}-\d{2}T", cols[1]):
            continue
        rows.append({
            "timestamp": cols[1],
            "task": cols[2],
            "outcome": cols[3],
            "summary": cols[4],
            "notes": cols[7],
        })
    return rows


def deepseek_spend_today() -> Dict[str, Any]:
    if not SPEND_FILE.exists():
        return {"deepseek": 0.0, "total": 0.0}
    try:
        data = json.loads(SPEND_FILE.read_text())
    except Exception:
        return {"deepseek": 0.0, "total": 0.0}
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    if data.get("date") != today:
        return {"deepseek": 0.0, "total": 0.0}
    spend = data.get("spend", {})
    return {
        "deepseek": float(spend.get("deepseek", 0.0)),
        "total": sum(float(v or 0) for v in spend.values()),
    }


def voice_fallback_files() -> List[str]:
    tmp = Path("/tmp")
    if not tmp.exists():
        return []
    return [f.name for f in tmp.glob("voice-*.md")]


def cron_jobs_overview() -> List[Dict[str, str]]:
    if not JOBS_FILE.exists():
        return []
    try:
        data = json.loads(JOBS_FILE.read_text())
    except Exception:
        return []
    jobs = data.get("jobs", [])
    return [
        {
            "id": j.get("id", "?"),
            "enabled": "✅" if j.get("enabled", True) else "❌",
            "schedule": j.get("schedule", {}).get("time", "?"),
        }
        for j in jobs
    ]


def aggregate_outcomes(rows: List[Dict[str, str]]) -> Dict[str, int]:
    counts = {"✅": 0, "⚠️": 0, "❌": 0, "🔁": 0, "?": 0}
    for r in rows:
        if "✅" in r["outcome"]:
            counts["✅"] += 1
        elif "⚠️" in r["outcome"]:
            counts["⚠️"] += 1
        elif "❌" in r["outcome"]:
            counts["❌"] += 1
        elif "🔁" in r["outcome"]:
            counts["🔁"] += 1
        else:
            counts["?"] += 1
    return counts


def render_handoff(
    rows: List[Dict[str, str]],
    spend: Dict[str, float],
    voice_pending: List[str],
    cron: List[Dict[str, str]],
) -> str:
    today = _dt.datetime.now().strftime("%Y-%m-%d %H:%M %Z").strip()
    outcomes = aggregate_outcomes(rows)

    body = f"""---
title: Hermes Session Handoff {today}
tags: [handoff, snapshot, hermes]
created: {today}
---

# 🪃 Hermes Session Handoff — {today}

## Today at a glance

- **Tasks logged today**: {len(rows)} ({outcomes["✅"]} ✅ · {outcomes["⚠️"]} ⚠️ · {outcomes["❌"]} ❌ · {outcomes["🔁"]} 🔁)
- **Triad spend today**: ${spend["total"]:.4f} total · DeepSeek ${spend["deepseek"]:.4f}
- **Voice notes pending flush**: {len(voice_pending)} {"(`" + "`, `".join(voice_pending[:5]) + "`)" if voice_pending else ""}

## Tasks run today

"""
    if rows:
        body += "| Time | Task | Outcome | Summary |\n"
        body += "|---|---|---|---|\n"
        for r in rows:
            short = r["timestamp"][11:16]
            summary = r["summary"][:60]
            body += f"| {short} | {r['task']} | {r['outcome']} | {summary} |\n"
    else:
        body += "_No tasks logged today yet._\n"

    body += "\n## Scheduled jobs\n\n"
    if cron:
        body += "| Job ID | Enabled | Schedule |\n"
        body += "|---|---|---|\n"
        for c in cron:
            body += f"| {c['id']} | {c['enabled']} | {c['schedule']} |\n"
    else:
        body += "_jobs.json unreadable_\n"

    body += textwrap.dedent(f"""\

        ## What's open

        - {len(voice_pending)} voice-note fallback file(s) on /tmp awaiting flush by `voice-flush` cron (runs every 15 min)
        - DeepSeek status: {"⚠️ near cap" if spend["deepseek"] > 0.5 else "✅ under soft warn"}
        - Failed tasks today: {outcomes["❌"]} → review and either fix or kill

        ## Quick commands from Telegram

        - `/aios-status` — live infra ping
        - `/aios-audit` — 4 C's coverage check
        - `/triad <forging>` — cost-aware execution plan
        - `/codify-workflow` — propose new skills from recent activity
        - `/aios-help` — full skill catalog

        ---

        _Generated by Hermes `/session-handoff` skill. Snapshot only — not a substitute for the Claude Code-side BATON.md._
    """)
    return body


def run(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    rows = today_activity_rows()
    spend = deepseek_spend_today()
    voice_pending = voice_fallback_files()
    cron = cron_jobs_overview()

    note = render_handoff(rows, spend, voice_pending, cron)

    today_filename = _dt.datetime.now().strftime("%Y-%m-%d-%H%M")
    filename = f"hermes-handoff-{today_filename}.md"
    saved: str | None = None

    if vault is not None:
        try:
            saved = vault.write("AIOS/Handoffs", filename, note, mode="overwrite")
            vault.log_activity(
                task="session-handoff",
                outcome="✅",
                summary=f"{len(rows)} tasks today, ${spend['total']:.2f} metered",
                notes=f"saved={saved}",
            )
        except Exception as exc:
            return {"reply": f"⚠️ generated handoff but couldn't save: {exc}", "body": note}

    reply_lines = [
        f"🪃 *Hermes Handoff* — {len(rows)} tasks today",
        f"Triad spend: ${spend['total']:.4f} (DeepSeek ${spend['deepseek']:.4f})",
        f"Voice fallbacks pending: {len(voice_pending)}",
        "",
        f"Saved: `AIOS/Handoffs/{filename}`",
    ]
    return {
        "reply": "\n".join(reply_lines),
        "saved_path": saved,
        "task_count": len(rows),
        "voice_pending": len(voice_pending),
        "spend": spend,
    }
