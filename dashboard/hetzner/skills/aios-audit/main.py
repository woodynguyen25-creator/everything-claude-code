"""/aios-audit — 4 C's coverage audit.

The 4 C's:
  - Context     — what does the AIOS know about Woody right now? (memory, intake)
  - Connections — MCPs, integrations, external surfaces
  - Capabilities — skills, agents, scheduled jobs
  - Cadence     — what runs how often, what hasn't run lately

Outputs:
  - A dated report written to AIOS/Reports/aios-audit-{YYYY-MM-DD}.md
  - One row appended to AIOS/AIOS-ACTIVITY-LOG.md
  - Telegram reply summarizing the top 3 findings
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import sys
import textwrap
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import vault  # type: ignore
except ImportError:
    vault = None  # tests without bridge

# Reference paths on the Droplet — read-only.
HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/home/hermes/.hermes"))
SKILLS_DIR = HERMES_HOME / "skills"
JOBS_FILE = HERMES_HOME / "jobs.json"
ACTIVITY_LOG_FOLDER = "AIOS"
REPORT_FOLDER = "AIOS/Reports"

STALE_DAYS = 90


# ──────────────────────────────────────────────────────────────────────────
# Audit sections
# ──────────────────────────────────────────────────────────────────────────


def audit_capabilities() -> Dict[str, Any]:
    """Walk Hermes skills. Identify how many exist + freshness signal."""
    skills: List[Dict[str, Any]] = []
    if SKILLS_DIR.exists():
        for entry in SKILLS_DIR.iterdir():
            if entry.is_dir() and not entry.name.startswith("_"):
                manifest = entry / "skill.yaml"
                if manifest.exists():
                    mtime = _dt.datetime.fromtimestamp(manifest.stat().st_mtime)
                    age_days = (_dt.datetime.now() - mtime).days
                    skills.append({
                        "name": entry.name,
                        "manifest_mtime": mtime.isoformat(timespec="seconds"),
                        "age_days": age_days,
                        "stale": age_days > STALE_DAYS,
                    })
    return {
        "total_skills": len(skills),
        "stale_skills": [s for s in skills if s["stale"]],
        "skills": sorted(skills, key=lambda s: s["age_days"], reverse=True),
    }


def audit_cadence() -> Dict[str, Any]:
    """Read jobs.json. Identify enabled vs disabled, error-handler coverage."""
    if not JOBS_FILE.exists():
        return {"jobs": [], "warning": f"{JOBS_FILE} not found"}
    try:
        config = json.loads(JOBS_FILE.read_text())
    except json.JSONDecodeError as exc:
        return {"jobs": [], "warning": f"jobs.json invalid: {exc}"}

    jobs = config.get("jobs", [])
    missing_error_handler = [
        j["id"] for j in jobs
        if j.get("enabled", True) and not j.get("on_error")
    ]
    disabled = [j["id"] for j in jobs if not j.get("enabled", True)]
    return {
        "total_jobs": len(jobs),
        "enabled": len([j for j in jobs if j.get("enabled", True)]),
        "disabled": disabled,
        "missing_error_handler": missing_error_handler,
    }


def audit_context() -> Dict[str, Any]:
    """Check vault memory health — does intake.md exist? is it current?"""
    if vault is None:
        return {"warning": "vault helper not available"}
    findings: Dict[str, Any] = {}
    # intake.md (from /aios-onboard) — quarterly refresh
    try:
        intake_content = vault.read("AIOS/Memory", "intake.md")
        findings["intake_present"] = True
        findings["intake_size"] = len(intake_content)
    except Exception:
        findings["intake_present"] = False

    # Auto-memory mirror — count files
    try:
        entries = vault.list_entries(folder="AIOS/Memory", glob="*.md")
        findings["memory_files"] = len(entries)
        if entries:
            newest = max(entries, key=lambda e: e["mtime"])
            findings["newest_memory_mtime"] = newest["mtime"]
    except Exception as exc:
        findings["memory_files_error"] = str(exc)

    return findings


def audit_connections() -> Dict[str, Any]:
    """Sanity-check Tailscale reachability of PC bridge."""
    if vault is None:
        return {"bridge_healthy": False, "warning": "vault helper not available"}
    return {"bridge_healthy": vault.bridge_healthy()}


# ──────────────────────────────────────────────────────────────────────────
# Report generation
# ──────────────────────────────────────────────────────────────────────────


def render_report(findings: Dict[str, Any]) -> str:
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    caps = findings["capabilities"]
    cadence = findings["cadence"]
    context = findings["context"]
    connections = findings["connections"]

    stale_names = ", ".join(s["name"] for s in caps["stale_skills"][:10]) or "_none_"

    body = f"""---
title: AIOS Audit {today}
tags: [report, audit, aios]
created: {today}
---

# 🔎 AIOS Audit — {today}

> The 4 C's: Context · Connections · Capabilities · Cadence.

## Capabilities

- **Total skills installed**: {caps["total_skills"]}
- **Stale (>{STALE_DAYS}d since manifest touched)**: {len(caps["stale_skills"])}
- **Stale candidates**: {stale_names}

## Cadence

- **Total jobs configured**: {cadence.get("total_jobs", "?")}
- **Enabled**: {cadence.get("enabled", "?")}
- **Disabled**: {", ".join(cadence.get("disabled", [])) or "_none_"}
- **Missing `on_error` handler**: {", ".join(cadence.get("missing_error_handler", [])) or "_none — all enabled jobs handled_"}

## Context

- **intake.md present**: {"yes" if context.get("intake_present") else "**no — run `/aios-onboard`**"}
- **Memory files in vault mirror**: {context.get("memory_files", "?")}
- **Newest memory mtime**: {context.get("newest_memory_mtime", "?")}

## Connections

- **PC bridge healthy**: {"yes ✅" if connections.get("bridge_healthy") else "**no ❌ — voice notes will fall back to /tmp**"}

## Recommended actions

"""

    actions: List[str] = []
    if not context.get("intake_present"):
        actions.append("- [ ] Run `/aios-onboard` — no intake.md found in vault")
    if cadence.get("missing_error_handler"):
        actions.append(
            "- [ ] Add `on_error` to: "
            + ", ".join(cadence["missing_error_handler"])
        )
    if caps["stale_skills"]:
        actions.append(
            f"- [ ] Review {len(caps['stale_skills'])} stale skills — keep, trim, or remove"
        )
    if not connections.get("bridge_healthy"):
        actions.append("- [ ] PC bridge unreachable — start `clean-start.ps1` on PC")
    if not actions:
        actions.append("- ✅ No issues surfaced this audit. Run again next week.")

    body += "\n".join(actions) + "\n"
    return body


def top_findings_summary(findings: Dict[str, Any]) -> str:
    bits: List[str] = []
    caps = findings["capabilities"]
    cadence = findings["cadence"]
    if caps["stale_skills"]:
        bits.append(f"{len(caps['stale_skills'])} stale skills")
    if cadence.get("missing_error_handler"):
        bits.append(f"{len(cadence['missing_error_handler'])} jobs missing error handler")
    if not findings["connections"].get("bridge_healthy"):
        bits.append("PC bridge unreachable")
    if not findings["context"].get("intake_present"):
        bits.append("intake.md missing")
    return "; ".join(bits) if bits else "all green"


# ──────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────


def run_audit(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Hermes entry point. Returns reply dict for Telegram + writes the report."""
    findings = {
        "capabilities": audit_capabilities(),
        "cadence": audit_cadence(),
        "context": audit_context(),
        "connections": audit_connections(),
    }

    report_body = render_report(findings)
    summary = top_findings_summary(findings)
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    filename = f"aios-audit-{today}.md"

    saved_path: str | None = None
    if vault is not None:
        try:
            saved_path = vault.write(REPORT_FOLDER, filename, report_body, mode="overwrite")
            outcome = "✅"
            log_summary = f"4Cs audit: {summary}"
            vault.log_activity(
                task="aios-audit",
                outcome=outcome,
                summary=log_summary,
                notes=f"report={REPORT_FOLDER}/{filename}",
            )
        except Exception as exc:
            return {
                "reply": f"⚠️ /aios-audit ran but couldn't write report: {exc}",
                "findings": findings,
            }

    reply = textwrap.dedent(f"""
        🔎 *AIOS Audit — {today}*

        {summary}

        Full report: `{REPORT_FOLDER}/{filename}`
    """).strip()

    return {
        "reply": reply,
        "findings": findings,
        "report_path": saved_path,
    }
