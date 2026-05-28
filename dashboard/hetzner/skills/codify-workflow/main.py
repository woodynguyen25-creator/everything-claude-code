"""/codify-workflow — Cooper's talk-and-codify ritual, automated.

Looks at the last 7 days of activity log + recent BATONs + recent voice notes,
finds patterns Woody is doing manually, and proposes new skills to codify them.

This is a meta-skill: it doesn't automate anything itself; it produces a
markdown proposal in AIOS/Reports/codify-proposal-<date>.md and pings Telegram.
"""

from __future__ import annotations

import datetime as _dt
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import models as workers  # type: ignore
    from _shared import vault              # type: ignore
except ImportError:
    vault = None
    workers = None

LOOKBACK_DAYS = 7
MIN_PATTERN_FREQ = 3  # show a pattern only if it appears 3+ times


# ──────────────────────────────────────────────────────────────────────────
# Pattern detection
# ──────────────────────────────────────────────────────────────────────────


def parse_activity_log(content: str) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for line in content.split("\n"):
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.split("|")]
        if len(cols) < 8:
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


def within_last_n_days(rows: List[Dict[str, str]], days: int) -> List[Dict[str, str]]:
    cutoff = (_dt.datetime.now() - _dt.timedelta(days=days)).isoformat()
    return [r for r in rows if r["timestamp"] >= cutoff]


def voice_note_themes(entries: List[Dict[str, Any]]) -> List[str]:
    """Extract recurring tags / topics from voice notes."""
    # Voice notes file names look like voice-YYYY-MM-DD-HHMM.md
    # Their content lives in different folders by tag — pull file paths and group.
    folders = Counter()
    for e in entries:
        parts = (e["relativePath"] or "").split("\\")
        if len(parts) >= 2:
            folders[parts[0]] += 1
    return [f"{folder} ({count}× this week)" for folder, count in folders.most_common(5)]


def task_frequency(activity_rows: List[Dict[str, str]]) -> List[str]:
    counter = Counter(r["task"] for r in activity_rows)
    high = [(t, n) for t, n in counter.items() if n >= MIN_PATTERN_FREQ]
    high.sort(key=lambda x: -x[1])
    return [f"`{task}` — {n}×" for task, n in high]


def failure_clusters(activity_rows: List[Dict[str, str]]) -> List[str]:
    by_task: Dict[str, List[str]] = {}
    for r in activity_rows:
        if "❌" in r["outcome"] or "⚠️" in r["outcome"]:
            by_task.setdefault(r["task"], []).append(r["notes"][:80])
    return [
        f"`{task}` — {len(notes)} failures. Sample: {notes[0]!r}"
        for task, notes in by_task.items()
        if len(notes) >= 2
    ]


# ──────────────────────────────────────────────────────────────────────────
# LLM proposal via free tier (Cerebras)
# ──────────────────────────────────────────────────────────────────────────


PROPOSAL_PROMPT = """\
You are an automation strategist for Woody Nguyen, a 19yo UH student building
his AIOS (Claude Code + Hermes Agent on Droplet + Obsidian Command Center).

Below are signals from the last 7 days of his automated work + voice-capture
activity. Propose 2-3 NEW skills that would codify a real pattern he's doing
manually or repeatedly. Each proposal must include:

- **Skill name** (kebab-case, like `/foo-bar`)
- **One-line description** of what it does
- **Trigger** — explicit command, cron schedule, or telegram tag
- **Why now** — what evidence in the signals justifies it
- **Smallest first version** — 3-5 bullet steps a junior could implement

Skip generic advice. Skip skills that already exist (voice-note, triad-router,
aios-audit, aios-onboard, aios-status, codify-workflow, md-ingest, aios-help).

Be ruthless. If the signals don't clearly justify a new skill, say so and
recommend deleting/merging an existing one instead.

SIGNALS:
{signals}

Format your response as markdown with H2 per proposal.
"""


def build_signals(
    activity_rows: List[Dict[str, str]],
    voice_themes: List[str],
    failures: List[str],
) -> str:
    parts: List[str] = []
    if activity_rows:
        freq = task_frequency(activity_rows)
        if freq:
            parts.append("### Most frequent task runs (last 7d)\n" + "\n".join(f"- {f}" for f in freq))
    if voice_themes:
        parts.append("### Voice note themes (last 7d)\n" + "\n".join(f"- {t}" for t in voice_themes))
    if failures:
        parts.append("### Failure clusters\n" + "\n".join(f"- {f}" for f in failures))
    return "\n\n".join(parts) or "_no notable signals in lookback window_"


# ──────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────


def run(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    if vault is None:
        return {"reply": "⚠️ vault helper unavailable; cannot read signals"}

    try:
        activity_md = vault.read("AIOS", "AIOS-ACTIVITY-LOG.md")
    except Exception as exc:
        return {"reply": f"⚠️ couldn't read activity log: {exc}"}

    activity_rows = within_last_n_days(parse_activity_log(activity_md), LOOKBACK_DAYS)

    voice_entries: List[Dict[str, Any]] = []
    try:
        voice_entries = vault.list_entries(folder="", glob="voice-*.md", recursive=True, limit=100)
    except Exception:
        pass
    voice_themes = voice_note_themes(voice_entries)

    failures = failure_clusters(activity_rows)
    signals = build_signals(activity_rows, voice_themes, failures)

    proposal_md = ""
    used_model = "none"
    if workers is not None:
        try:
            result = workers.call_cerebras(PROPOSAL_PROMPT.format(signals=signals))
            proposal_md = result["text"]
            used_model = result["model"]
        except workers.WorkerError as exc:  # type: ignore[attr-defined]
            # Free critic fallback
            try:
                result = workers.call_gemini_flash(PROPOSAL_PROMPT.format(signals=signals))
                proposal_md = result["text"]
                used_model = result["model"]
            except workers.WorkerError as exc2:
                proposal_md = f"_LLM unavailable: {exc2}. Raw signals below:_\n\n{signals}"

    today = _dt.datetime.now().strftime("%Y-%m-%d")
    body = f"""---
title: Codify-Workflow Proposal {today}
tags: [report, codify, automation, proposal]
created: {today}
model: {used_model}
---

# 📜 Codify-Workflow Proposal — {today}

> Auto-generated from the last {LOOKBACK_DAYS} days of activity. Cooper's ritual, automated.

## Signals (raw)

{signals}

## Proposed new skills

{proposal_md}

---

## Next steps

- [ ] Skim the proposals; reject the ones that don't match real pain
- [ ] For survivors, run `/skill-create` or hand-write the v0.1 manifest
- [ ] Re-run `/codify-workflow` in 7 days to see if patterns shifted
"""

    filename = f"codify-proposal-{today}.md"
    try:
        saved = vault.write("AIOS/Reports", filename, body, mode="overwrite")
        vault.log_activity(
            task="codify-workflow",
            outcome="✅",
            summary=f"proposed via {used_model}",
            tokens=None,
            notes=f"saved={saved}",
        )
    except Exception as exc:
        return {"reply": f"⚠️ produced proposal but couldn't save: {exc}", "body": body}

    return {
        "reply": (
            f"📜 *Codify-Workflow* — proposal written.\n\n"
            f"Signals: {len(activity_rows)} activity rows, {len(voice_entries)} voice notes, "
            f"{len(failures)} failure clusters.\n\n"
            f"Saved: `AIOS/Reports/{filename}`"
        ),
        "saved_path": saved,
        "model": used_model,
    }
