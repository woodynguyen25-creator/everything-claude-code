"""/skill-eval — run pytest across every installed skill, report results.

Walks ~/.hermes/skills/<skill>/test_*.py, runs each suite, aggregates
results into a Telegram-friendly summary. Saves a full report to
AIOS/Reports/skill-eval-{date}.md.

Read-only: never modifies skill code. Surfaces breakage before deploy.
"""

from __future__ import annotations

import datetime as _dt
import os
import subprocess
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
PYTEST_TIMEOUT = 30  # seconds per skill


def find_skills_with_tests() -> List[Path]:
    if not SKILLS_DIR.exists():
        return []
    skills: List[Path] = []
    for entry in sorted(SKILLS_DIR.iterdir()):
        if not entry.is_dir():
            continue
        has_test = any(entry.glob("test_*.py"))
        if has_test:
            skills.append(entry)
    return skills


def run_pytest(skill_dir: Path) -> Dict[str, Any]:
    """Run pytest in the skill's directory. Returns result dict."""
    try:
        proc = subprocess.run(
            ["python", "-m", "pytest", "-q", "--tb=line", "--no-header"],
            cwd=skill_dir,
            capture_output=True,
            text=True,
            timeout=PYTEST_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        return {
            "skill": skill_dir.name,
            "status": "timeout",
            "passed": 0,
            "failed": 0,
            "errors": 0,
            "summary": f"timed out after {PYTEST_TIMEOUT}s",
        }
    except FileNotFoundError:
        return {
            "skill": skill_dir.name,
            "status": "error",
            "passed": 0,
            "failed": 0,
            "errors": 1,
            "summary": "python not found on PATH",
        }

    # Parse pytest summary line: "5 passed in 0.42s" or "2 failed, 3 passed in 1s"
    output = proc.stdout + proc.stderr
    passed, failed, errors = _parse_pytest_counts(output)

    if proc.returncode == 0:
        status = "pass"
    elif passed > 0 and failed == 0 and errors == 0:
        status = "no_tests"  # pytest exits non-zero when 0 tests collected
    else:
        status = "fail"

    return {
        "skill": skill_dir.name,
        "status": status,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "summary": _extract_summary_line(output),
        "exit_code": proc.returncode,
    }


def _parse_pytest_counts(text: str) -> tuple[int, int, int]:
    """Find passed/failed/errors counts in pytest output."""
    import re
    passed = failed = errors = 0
    p = re.search(r"(\d+) passed", text)
    if p: passed = int(p.group(1))
    f = re.search(r"(\d+) failed", text)
    if f: failed = int(f.group(1))
    e = re.search(r"(\d+) error", text)
    if e: errors = int(e.group(1))
    return passed, failed, errors


def _extract_summary_line(text: str) -> str:
    """Extract the most useful single line from pytest output."""
    for line in reversed(text.split("\n")):
        s = line.strip()
        if s and ("passed" in s or "failed" in s or "error" in s):
            return s[:120]
    return text.strip().split("\n")[-1][:120] if text.strip() else "no output"


def render_report(results: List[Dict[str, Any]]) -> str:
    today = _dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    total_pass = sum(r["passed"] for r in results)
    total_fail = sum(r["failed"] for r in results)
    total_err = sum(r["errors"] for r in results)
    failing = [r for r in results if r["status"] in {"fail", "timeout", "error"}]

    body = f"""---
title: Skill Eval {today}
tags: [report, eval, skills, health]
created: {today}
---

# 🧪 Skill Eval — {today}

## Headline

- **Skills with tests**: {len(results)}
- **Tests passed**: {total_pass}
- **Tests failed**: {total_fail}
- **Errors**: {total_err}
- **Failing skills**: {len(failing)}

## Per-skill results

| Skill | Status | Pass | Fail | Errors | Summary |
|---|---|---|---|---|---|
"""
    for r in results:
        icon = {"pass": "✅", "fail": "❌", "timeout": "⏱️", "error": "💥", "no_tests": "—"}.get(r["status"], "❓")
        body += f"| `{r['skill']}` | {icon} | {r['passed']} | {r['failed']} | {r['errors']} | {r['summary'][:60]} |\n"

    if failing:
        body += "\n## Failing detail\n\n"
        for r in failing:
            body += f"### `{r['skill']}` — {r['status']}\n\n"
            body += f"```\n{r['summary']}\n```\n\n"

    body += "\n## Next steps\n\n"
    if not failing:
        body += "- ✅ All skill tests pass. Safe to deploy.\n"
    else:
        body += f"- Fix the {len(failing)} failing skill(s) before deploy\n"
        body += "- Re-run `/skill-eval` after fixes\n"

    return body


def render_telegram_summary(results: List[Dict[str, Any]]) -> str:
    total_pass = sum(r["passed"] for r in results)
    total_fail = sum(r["failed"] for r in results)
    failing = [r for r in results if r["status"] in {"fail", "timeout", "error"}]

    icon = "✅" if not failing else "⚠️"
    lines = [
        f"{icon} *Skill Eval*",
        "",
        f"Skills tested: {len(results)} · Pass: {total_pass} · Fail: {total_fail}",
    ]
    if failing:
        lines.append("")
        lines.append("*Failing:*")
        for r in failing[:8]:
            lines.append(f"- `{r['skill']}` — {r['summary'][:60]}")
        if len(failing) > 8:
            lines.append(f"_…and {len(failing) - 8} more_")
    return "\n".join(lines)


def run(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    skills = find_skills_with_tests()
    if not skills:
        return {"reply": "_No skills with tests found in ~/.hermes/skills/_"}

    results = [run_pytest(skill) for skill in skills]
    today_filename = _dt.datetime.now().strftime("%Y-%m-%d")
    report = render_report(results)
    summary = render_telegram_summary(results)

    saved_path: str | None = None
    if vault is not None:
        try:
            saved_path = vault.write(
                "AIOS/Reports",
                f"skill-eval-{today_filename}.md",
                report,
                mode="overwrite",
            )
            failing = [r for r in results if r["status"] not in {"pass", "no_tests"}]
            vault.log_activity(
                task="skill-eval",
                outcome="✅" if not failing else "⚠️",
                summary=f"{len(results)} skills, {len(failing)} failing",
                notes=f"saved={saved_path}",
            )
        except Exception:
            pass

    return {
        "reply": summary + (f"\n\nFull report: `{saved_path}`" if saved_path else ""),
        "results": results,
        "saved_path": saved_path,
    }
