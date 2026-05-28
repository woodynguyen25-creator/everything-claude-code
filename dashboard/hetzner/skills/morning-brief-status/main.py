"""/morning-brief — did today's brief fire, and what's in it?

Looks for `Trading Assistant/Morning Briefs/<YYYY-MM-DD>.md` (or similar).
Returns the headline section + watchlist. Falls back to scanning
AIOS-ACTIVITY-LOG for `morning-brief` task rows from today if no note exists.
"""

from __future__ import annotations

import datetime as _dt
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import vault  # type: ignore
except ImportError:
    vault = None

# Likely folders/prefixes the morning brief writes to. Tried in order.
BRIEF_PATH_CANDIDATES = [
    ("Trading Assistant/Morning Briefs", "{date}.md"),
    ("Trading Assistant", "morning-brief-{date}.md"),
    ("Trading Assistant", "{date}.md"),
]


def find_today_brief(today: str) -> Dict[str, Any] | None:
    if vault is None:
        return None
    for folder, pattern in BRIEF_PATH_CANDIDATES:
        filename = pattern.format(date=today)
        try:
            content = vault.read(folder, filename)
            return {"folder": folder, "filename": filename, "content": content}
        except Exception:
            continue
    return None


def extract_summary(content: str, max_lines: int = 18) -> str:
    """Pull the most useful chunk from the brief. Heuristic — looks for headline
    + watchlist section if present."""
    lines = content.split("\n")

    # Strip YAML frontmatter
    if lines and lines[0].strip() == "---":
        end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), 0)
        lines = lines[end + 1:]

    interesting: List[str] = []
    inside_watchlist = False
    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()
        # H1/H2 headers, watchlist tickers, bullets
        if (
            stripped.startswith("#")
            or "watchlist" in lower
            or re.match(r"^[-*•]\s+", stripped)
            or re.match(r"^[A-Z]{1,5}\s+[$\d]", stripped)
            or "spy" in lower
            or "vix" in lower
        ):
            interesting.append(stripped)
            inside_watchlist = "watchlist" in lower or inside_watchlist
            if len(interesting) >= max_lines:
                break
        elif inside_watchlist and stripped:
            interesting.append(stripped)
            if len(interesting) >= max_lines:
                break

    if not interesting:
        # Fall back to first ~10 non-empty lines
        interesting = [ln for ln in lines if ln.strip()][:10]
    return "\n".join(interesting[:max_lines])


def fallback_activity_log() -> List[Dict[str, str]]:
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
        if cols[2] != "morning-brief":
            continue
        rows.append({
            "timestamp": cols[1],
            "outcome": cols[3],
            "summary": cols[4],
        })
    return rows


def run(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    brief = find_today_brief(today)

    if brief is not None:
        summary = extract_summary(brief["content"])
        reply = (
            f"☕ *Morning Brief — {today}*\n"
            f"_Source: `{brief['folder']}/{brief['filename']}`_\n\n"
            f"{summary}"
        )
        return {
            "reply": reply,
            "found": True,
            "path": f"{brief['folder']}/{brief['filename']}",
            "char_count": len(brief["content"]),
        }

    # Fallback to activity log
    rows = fallback_activity_log()
    if not rows:
        return {
            "reply": (
                f"⚠️ No morning brief found for {today}.\n\n"
                "Checked: `Trading Assistant/Morning Briefs/{date}.md`, "
                "`Trading Assistant/morning-brief-{date}.md`, "
                "`Trading Assistant/{date}.md`. Activity log shows no "
                "`morning-brief` rows today either — looks like the job "
                "didn't fire."
            ),
            "found": False,
        }

    latest = rows[-1]
    return {
        "reply": (
            f"⚠️ Morning brief note not found in vault, but activity log shows "
            f"the job ran today:\n\n"
            f"- `{latest['timestamp'][11:16]}` {latest['outcome']} — {latest['summary']}\n\n"
            "Check the morning-brief script's write path."
        ),
        "found": False,
        "activity_rows": len(rows),
    }
