"""/aios-prune — propose specific deletions based on /aios-audit history.

Read-only. Never auto-deletes. Outputs a prune-proposal report with:
  - Stale skills (audit-flagged, not touched in 90d)
  - Idle scheduled jobs (no activity-log rows in 30d)
  - Disabled jobs that have been disabled 60d+
  - Skills with no test coverage AND no recent successful runs

For each: one-line reason + suggested action (delete / merge into X / keep).

Pairs naturally with /aios-audit (weekly evidence) and /skill-eval (test
health). Run monthly: audit → eval → prune.
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

HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/home/hermes/.hermes"))
SKILLS_DIR = HERMES_HOME / "skills"
JOBS_FILE = HERMES_HOME / "jobs.json"

STALE_SKILL_DAYS = 90
IDLE_JOB_DAYS = 30
DISABLED_JOB_DAYS = 60

# Protected skills — never propose deletion regardless of staleness
PROTECTED_SKILLS = {
    "voice-note",      # the mobile capture loop
    "triad-router",    # the orchestrator
    "aios-audit",      # audit infrastructure itself
    "aios-prune",      # this skill
    "aios-status",     # health check
    "aios-help",       # discovery
    "session-handoff", # snapshot
    "_shared",         # shared lib
}


def find_latest_audit() -> Dict[str, Any] | None:
    """Read the latest aios-audit report from the vault."""
    if vault is None:
        return None
    try:
        entries = vault.list_entries(folder="AIOS/Reports", glob="aios-audit-*.md")
    except Exception:
        return None
    if not entries:
        return None
    latest = entries[0]  # list_entries returns newest-first
    try:
        content = vault.read("AIOS/Reports", latest["relativePath"].split("\\")[-1].split("/")[-1])
    except Exception:
        try:
            # Fallback: try just the filename
            filename = Path(latest["relativePath"]).name
            content = vault.read("AIOS/Reports", filename)
        except Exception:
            return None
    return {"content": content, "path": latest.get("path", "?"), "mtime": latest.get("mtime", "?")}


def collect_skills() -> List[Dict[str, Any]]:
    """Walk skill manifests, return age + test/readme/protected status."""
    if not SKILLS_DIR.exists():
        return []
    now = _dt.datetime.now()
    skills: List[Dict[str, Any]] = []
    for entry in SKILLS_DIR.iterdir():
        if not entry.is_dir() or entry.name.startswith(".") or entry.name == "_shared":
            continue
        manifest = entry / "skill.yaml"
        if not manifest.exists():
            continue
        mtime = _dt.datetime.fromtimestamp(manifest.stat().st_mtime)
        age_days = (now - mtime).days
        files = list(entry.iterdir())
        has_tests = any(f.name.startswith("test_") and f.name.endswith(".py") for f in files)
        skills.append({
            "name": entry.name,
            "age_days": age_days,
            "has_tests": has_tests,
            "protected": entry.name in PROTECTED_SKILLS,
            "manifest_mtime": mtime.isoformat(timespec="seconds"),
        })
    return skills


def collect_jobs() -> List[Dict[str, Any]]:
    if not JOBS_FILE.exists():
        return []
    try:
        config = json.loads(JOBS_FILE.read_text())
    except json.JSONDecodeError:
        return []
    return config.get("jobs", [])


def activity_log_per_task() -> Dict[str, Dict[str, Any]]:
    """Parse the activity log; return per-task last_seen + run_count."""
    if vault is None:
        return {}
    try:
        log = vault.read("AIOS", "AIOS-ACTIVITY-LOG.md")
    except Exception:
        return {}

    by_task: Dict[str, Dict[str, Any]] = {}
    for line in log.split("\n"):
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.split("|")]
        if len(cols) < 8:
            continue
        if not re.match(r"^\d{4}-\d{2}-\d{2}T", cols[1]):
            continue
        ts, task, outcome = cols[1], cols[2], cols[3]
        if task not in by_task:
            by_task[task] = {"last_seen": ts, "runs": 0, "successes": 0}
        if ts > by_task[task]["last_seen"]:
            by_task[task]["last_seen"] = ts
        by_task[task]["runs"] += 1
        if "✅" in outcome:
            by_task[task]["successes"] += 1
    return by_task


def propose_deletions(
    skills: List[Dict[str, Any]],
    jobs: List[Dict[str, Any]],
    activity: Dict[str, Dict[str, Any]],
) -> Dict[str, List[Dict[str, str]]]:
    """Build categorized proposals."""
    now = _dt.datetime.now()
    proposals: Dict[str, List[Dict[str, str]]] = {
        "stale_skills": [],
        "untested_skills": [],
        "idle_jobs": [],
        "disabled_jobs": [],
        "keep_questioning": [],
    }

    # Stale skills
    for skill in skills:
        if skill["protected"]:
            continue
        if skill["age_days"] > STALE_SKILL_DAYS:
            seen = activity.get(skill["name"], {})
            last_seen = seen.get("last_seen", "never")
            proposals["stale_skills"].append({
                "name": skill["name"],
                "reason": f"manifest {skill['age_days']}d old; last activity {last_seen}",
                "action": "review — delete if no longer needed",
            })

    # Untested skills with no recent activity
    for skill in skills:
        if skill["protected"] or skill["has_tests"]:
            continue
        seen = activity.get(skill["name"], {})
        runs = seen.get("runs", 0)
        if runs < 3:
            proposals["untested_skills"].append({
                "name": skill["name"],
                "reason": f"no pytest, only {runs} run(s) in log",
                "action": "add tests OR delete if speculative",
            })

    # Idle jobs (enabled but no recent log entries)
    job_id_to_task = {j.get("id", "?"): j for j in jobs}
    for job_id, job in job_id_to_task.items():
        if not job.get("enabled", True):
            continue
        seen = activity.get(job_id, {})
        if not seen:
            proposals["idle_jobs"].append({
                "name": job_id,
                "reason": "enabled but never logged a run",
                "action": "verify cron triggers OR disable",
            })
            continue
        last_seen_ts = seen.get("last_seen", "")
        try:
            last_dt = _dt.datetime.fromisoformat(last_seen_ts)
            if (now - last_dt).days > IDLE_JOB_DAYS:
                proposals["idle_jobs"].append({
                    "name": job_id,
                    "reason": f"last run {(now - last_dt).days}d ago",
                    "action": "verify cron OR disable",
                })
        except (ValueError, TypeError):
            pass

    # Disabled jobs (should they be deleted?)
    for job in jobs:
        if job.get("enabled", True):
            continue
        proposals["disabled_jobs"].append({
            "name": job.get("id", "?"),
            "reason": "disabled — was it disabled deliberately or just forgotten?",
            "action": "decide: re-enable, delete, or document why disabled",
        })

    return proposals


def render_report(proposals: Dict[str, List[Dict[str, str]]], audit_meta: str) -> str:
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    body = f"""---
title: AIOS Prune Proposal {today}
tags: [report, prune, aios, audit]
created: {today}
---

# ✂️ AIOS Prune Proposal — {today}

> Read-only suggestions. Apply manually — never auto-deleted.
> Companion to `/aios-audit` ({audit_meta}).

## Summary

- Stale skills (>{STALE_SKILL_DAYS}d): **{len(proposals['stale_skills'])}**
- Untested + low-activity skills: **{len(proposals['untested_skills'])}**
- Idle scheduled jobs (>{IDLE_JOB_DAYS}d silent): **{len(proposals['idle_jobs'])}**
- Disabled jobs in config: **{len(proposals['disabled_jobs'])}**

"""

    sections = [
        ("stale_skills", "## 🪦 Stale skills", "(manifest >90d, low activity)"),
        ("untested_skills", "## 🧪 Untested skills", "(no pytest, <3 logged runs)"),
        ("idle_jobs", "## 😴 Idle scheduled jobs", "(no log entries in 30d)"),
        ("disabled_jobs", "## ⏸️ Disabled jobs", "(currently disabled in jobs.json)"),
    ]

    for key, header, subtitle in sections:
        items = proposals[key]
        body += f"{header} {subtitle}\n\n"
        if not items:
            body += "_None._\n\n"
            continue
        body += "| Name | Reason | Action |\n|---|---|---|\n"
        for it in items:
            reason = it["reason"].replace("|", "\\|")
            action = it["action"].replace("|", "\\|")
            body += f"| `{it['name']}` | {reason} | {action} |\n"
        body += "\n"

    body += textwrap_block("""
        ## How to apply

        For each row you decide to delete:

        1. **Skill:** `hermes skill uninstall <name>` (Droplet) and delete the
           folder under `dashboard/hetzner/skills/<name>/` in the repo.
        2. **Job:** Edit `hermes-jobs.json` — remove the entry or set
           `"enabled": false`. Then `hermes cron reload`.
        3. **Test coverage gap:** Either write tests OR delete the skill.

        Re-run `/aios-prune` after acting to confirm the catalog shrunk.

        ---

        _Generated by `/aios-prune`. Always review before acting._
    """).strip() + "\n"

    return body


def textwrap_block(text: str) -> str:
    import textwrap
    return textwrap.dedent(text)


def render_telegram_summary(proposals: Dict[str, List[Dict[str, str]]]) -> str:
    total = sum(len(v) for v in proposals.values())
    if total == 0:
        return "✅ *Prune proposal* — nothing flagged. AIOS is lean."

    parts = ["✂️ *Prune proposal*"]
    parts.append("")
    if proposals["stale_skills"]:
        parts.append(f"🪦 {len(proposals['stale_skills'])} stale skill(s)")
    if proposals["untested_skills"]:
        parts.append(f"🧪 {len(proposals['untested_skills'])} untested skill(s)")
    if proposals["idle_jobs"]:
        parts.append(f"😴 {len(proposals['idle_jobs'])} idle job(s)")
    if proposals["disabled_jobs"]:
        parts.append(f"⏸️ {len(proposals['disabled_jobs'])} disabled job(s)")
    parts.append("")
    parts.append("_Full report in AIOS/Reports/ — review before deleting._")
    return "\n".join(parts)


def run(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    skills = collect_skills()
    jobs = collect_jobs()
    activity = activity_log_per_task()
    latest_audit = find_latest_audit()
    audit_meta = (
        f"latest audit {latest_audit['mtime']}"
        if latest_audit
        else "no audit found yet — run `/aios-audit` first for stronger signal"
    )

    proposals = propose_deletions(skills, jobs, activity)
    report = render_report(proposals, audit_meta)
    summary = render_telegram_summary(proposals)

    saved_path: str | None = None
    if vault is not None:
        today_filename = _dt.datetime.now().strftime("%Y-%m-%d")
        try:
            saved_path = vault.write(
                "AIOS/Reports",
                f"aios-prune-{today_filename}.md",
                report,
                mode="overwrite",
            )
            total = sum(len(v) for v in proposals.values())
            vault.log_activity(
                task="aios-prune",
                outcome="✅",
                summary=f"{total} candidates flagged",
                notes=f"saved={saved_path}",
            )
        except Exception as exc:
            return {"reply": f"⚠️ generated proposal but couldn't save: {exc}", "report": report}

    return {
        "reply": summary + (f"\n\nFull: `{saved_path}`" if saved_path else ""),
        "proposals": proposals,
        "saved_path": saved_path,
    }
