"""/skill-stats — quick metric snapshot of the Hermes skill catalog.

Walks ~/.hermes/skills/, counts per-skill LOC, identifies which have tests,
computes coverage % and avg age. Useful for monthly health checks and as a
data source for the dashboard activity widget.
"""

from __future__ import annotations

import datetime as _dt
import os
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


def count_lines(file_path: Path) -> int:
    try:
        return sum(1 for _ in file_path.open(encoding="utf-8", errors="ignore"))
    except OSError:
        return 0


def gather_stats() -> Dict[str, Any]:
    """Walk skills dir, return per-skill + aggregate metrics."""
    if not SKILLS_DIR.exists():
        return {"skills": [], "totals": {"count": 0, "loc": 0, "tested": 0, "test_loc": 0}}

    skills: List[Dict[str, Any]] = []
    now = _dt.datetime.now()

    for entry in sorted(SKILLS_DIR.iterdir()):
        if not entry.is_dir() or entry.name.startswith("."):
            continue
        if entry.name == "_shared":
            # Treat _shared as a special row, not counted in skill count
            shared_files = list(entry.glob("*.py"))
            shared_loc = sum(count_lines(f) for f in shared_files if not f.name.startswith("test_"))
            shared_test_loc = sum(count_lines(f) for f in shared_files if f.name.startswith("test_"))
            skills.append({
                "name": "_shared",
                "kind": "library",
                "loc": shared_loc,
                "test_loc": shared_test_loc,
                "has_tests": shared_test_loc > 0,
                "age_days": (now - _dt.datetime.fromtimestamp(entry.stat().st_mtime)).days,
            })
            continue

        manifest = entry / "skill.yaml"
        if not manifest.exists():
            continue
        files = list(entry.iterdir())
        main_files = [f for f in files if f.suffix == ".py" and not f.name.startswith("test_")]
        test_files = [f for f in files if f.name.startswith("test_") and f.suffix == ".py"]
        loc = sum(count_lines(f) for f in main_files)
        test_loc = sum(count_lines(f) for f in test_files)
        mtime = _dt.datetime.fromtimestamp(manifest.stat().st_mtime)

        skills.append({
            "name": entry.name,
            "kind": "skill",
            "loc": loc,
            "test_loc": test_loc,
            "has_tests": len(test_files) > 0,
            "age_days": (now - mtime).days,
        })

    skill_rows = [s for s in skills if s["kind"] == "skill"]
    totals = {
        "count": len(skill_rows),
        "loc": sum(s["loc"] for s in skill_rows),
        "test_loc": sum(s["test_loc"] for s in skill_rows),
        "tested": sum(1 for s in skill_rows if s["has_tests"]),
        "test_coverage_pct": (
            round(100 * sum(1 for s in skill_rows if s["has_tests"]) / len(skill_rows))
            if skill_rows else 0
        ),
        "avg_age_days": (
            round(sum(s["age_days"] for s in skill_rows) / len(skill_rows))
            if skill_rows else 0
        ),
    }
    return {"skills": skills, "totals": totals}


def render_telegram_summary(stats: Dict[str, Any]) -> str:
    t = stats["totals"]
    lines = [
        "📊 *Hermes Skill Stats*",
        "",
        f"• Skills installed: *{t['count']}*",
        f"• Total LOC: *{t['loc']:,}* (skill code) + *{t['test_loc']:,}* (tests)",
        f"• Pytest coverage: *{t['test_coverage_pct']}%* ({t['tested']}/{t['count']} skills)",
        f"• Avg skill age: *{t['avg_age_days']}d*",
    ]
    return "\n".join(lines)


def render_report(stats: Dict[str, Any]) -> str:
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    t = stats["totals"]
    body = f"""---
title: Skill Stats {today}
tags: [report, stats, skills]
created: {today}
---

# 📊 Skill Stats — {today}

## Aggregate

- **Skills installed**: {t['count']}
- **Total skill LOC**: {t['loc']:,}
- **Total test LOC**: {t['test_loc']:,}
- **Test coverage**: {t['test_coverage_pct']}% ({t['tested']}/{t['count']} skills with pytest)
- **Average age**: {t['avg_age_days']} days

## Per-skill

| Skill | Kind | LOC | Test LOC | Tests | Age (d) |
|---|---|---|---|---|---|
"""
    for s in stats["skills"]:
        tests = "✅" if s["has_tests"] else "—"
        body += f"| `{s['name']}` | {s['kind']} | {s['loc']:,} | {s['test_loc']:,} | {tests} | {s['age_days']} |\n"

    body += "\n## Health notes\n\n"
    if t["test_coverage_pct"] >= 80:
        body += "- ✅ Test coverage above 80% — solid.\n"
    elif t["test_coverage_pct"] >= 60:
        body += "- 🟨 Test coverage 60-80% — okay, fill gaps with `/skill-eval` findings.\n"
    else:
        body += "- ⚠️ Test coverage below 60% — flag in next audit.\n"
    if t["avg_age_days"] > 60:
        body += "- 🪦 Average skill age >60d — run `/skill-trim` for compression candidates.\n"
    else:
        body += "- 🌱 Catalog is young/active.\n"
    return body


def run(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    stats = gather_stats()
    summary = render_telegram_summary(stats)
    report = render_report(stats)

    saved_path: str | None = None
    if vault is not None:
        today_filename = _dt.datetime.now().strftime("%Y-%m-%d")
        try:
            saved_path = vault.write(
                "AIOS/Reports",
                f"skill-stats-{today_filename}.md",
                report,
                mode="overwrite",
            )
            t = stats["totals"]
            vault.log_activity(
                task="skill-stats",
                outcome="✅",
                summary=f"{t['count']} skills, {t['test_coverage_pct']}% tested, {t['loc']:,} LOC",
                notes=f"saved={saved_path}",
            )
        except Exception:
            pass

    return {
        "reply": summary + (f"\n\nFull: `{saved_path}`" if saved_path else ""),
        "stats": stats,
        "saved_path": saved_path,
    }
