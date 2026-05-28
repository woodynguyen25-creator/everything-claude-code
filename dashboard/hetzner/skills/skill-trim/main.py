"""/skill-trim — propose shorter versions of installed skills.

Per AI Masterclass synthesis #4.7: many skills are bloated imports. This
skill reads every installed Hermes skill, asks Cerebras (free) to compress
the *prompt-bearing parts* while preserving intent, and produces a diff
report Woody can review.

Read-only by design. Never auto-applies trims. The output is a markdown
report at AIOS/Reports/skill-trim-<date>.md with before/after for each
skill, plus a one-line verdict per skill.
"""

from __future__ import annotations

import datetime as _dt
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import models as workers  # type: ignore
    from _shared import vault              # type: ignore
except ImportError:
    workers = None
    vault = None

HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/home/hermes/.hermes"))
SKILLS_DIR = HERMES_HOME / "skills"

# Skip system skills and the trim skill itself (no point trimming the trimmer).
SKIP_SKILLS = {"_shared", "skill-trim"}

# Patterns that look like prompts inside skill source code. We focus on these
# rather than trying to compress arbitrary Python; that would be unsafe.
PROMPT_PATTERN = re.compile(
    r'((?:[A-Z_]+_PROMPT|[A-Z_]+_SYSTEM_PROMPT|PROPOSAL_PROMPT|SYSTEM)\s*=\s*[ruRU]?"""[^"]+""")',
    re.DOTALL,
)


def collect_skill_prompts() -> List[Dict[str, str]]:
    """Find all skills + extract their prompt-bearing constants for compression."""
    if not SKILLS_DIR.exists():
        return []
    results: List[Dict[str, str]] = []
    for entry in sorted(SKILLS_DIR.iterdir()):
        if not entry.is_dir() or entry.name in SKIP_SKILLS or entry.name.startswith("_"):
            continue
        main_py = entry / "main.py"
        if not main_py.exists():
            continue
        try:
            source = main_py.read_text()
        except OSError:
            continue
        prompts = PROMPT_PATTERN.findall(source)
        for prompt_block in prompts:
            results.append({
                "skill": entry.name,
                "prompt_block": prompt_block,
                "char_count": len(prompt_block),
            })
    return results


COMPRESSION_SYSTEM = """\
You compress prompts. Given a Python prompt constant, return ONLY a compressed
version that preserves intent while removing:
- Redundant sentences
- Filler phrases
- Examples that don't change behavior
- Repetition across rules

DO NOT:
- Change variable names or the assignment line
- Remove load-bearing constraints, formats, or output schemas
- Drop concrete examples that anchor the model's output style

Return the assignment block in the same shape (NAME = \"\"\"...\"\"\"), nothing else.
If you can't compress meaningfully (already tight), return: KEEP
"""


def propose_compression(prompt_block: str) -> Dict[str, Any]:
    """Ask Cerebras (free) to compress. Returns a verdict dict."""
    if workers is None:
        return {"verdict": "skip", "reason": "_shared.models not available", "compressed": ""}
    try:
        result = workers.call_cerebras(
            f"Compress this prompt:\n\n{prompt_block}",
            system=COMPRESSION_SYSTEM,
            max_tokens=2_000,
        )
        text = result["text"].strip()
        if text.upper().startswith("KEEP"):
            return {"verdict": "keep", "reason": "critic says already tight", "compressed": ""}
        new_size = len(text)
        old_size = len(prompt_block)
        if new_size >= old_size:
            return {
                "verdict": "no-win",
                "reason": f"proposed {new_size} chars vs original {old_size}",
                "compressed": text,
            }
        return {
            "verdict": "compress",
            "reason": f"{old_size}→{new_size} ({100 * (1 - new_size / old_size):.0f}% smaller)",
            "compressed": text,
        }
    except workers.WorkerError as exc:  # type: ignore[attr-defined]
        return {"verdict": "error", "reason": str(exc), "compressed": ""}


def render_report(items: List[Dict[str, Any]]) -> str:
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    body = f"""---
title: Skill-Trim Report {today}
tags: [report, skill, trim, compression]
created: {today}
---

# ✂️ Skill-Trim Report — {today}

> Read-only proposal scan. Apply manually if any compression looks good.
> Per AI Masterclass synthesis adoption #4.7.

## Summary

| Skill | Block | Verdict | Reason |
|---|---|---|---|
"""
    for it in items:
        skill = it["skill"]
        verdict = it["verdict"]
        reason = it["reason"][:80].replace("|", "\\|")
        first_line = it["prompt_block"].split("\n", 1)[0][:50]
        body += f"| `{skill}` | `{first_line}` | **{verdict}** | {reason} |\n"

    body += "\n## Per-skill detail\n\n"
    for it in items:
        if it["verdict"] != "compress":
            continue
        body += f"### `{it['skill']}` — {it['reason']}\n\n"
        body += "**Original:**\n\n````python\n"
        body += it["prompt_block"]
        body += "\n````\n\n**Proposed:**\n\n````python\n"
        body += it["compressed"]
        body += "\n````\n\n"

    body += "\n## Next steps\n\n"
    body += "- Skim 'compress' verdicts above\n"
    body += "- For each that's still solid, copy the proposed block into the skill's main.py\n"
    body += "- Re-run pytest for that skill to confirm intent preserved\n"
    body += "- Skip 'no-win' and 'keep' — those are already tight\n"
    return body


def run(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    if workers is None or vault is None:
        return {"reply": "⚠️ shared helpers not available; can't run skill-trim"}

    prompt_items = collect_skill_prompts()
    if not prompt_items:
        return {"reply": "_No skills with extractable prompt constants found._"}

    items: List[Dict[str, Any]] = []
    for item in prompt_items:
        proposal = propose_compression(item["prompt_block"])
        items.append({**item, **proposal})

    report = render_report(items)
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    filename = f"skill-trim-{today}.md"
    try:
        saved = vault.write("AIOS/Reports", filename, report, mode="overwrite")
        compress_count = sum(1 for i in items if i["verdict"] == "compress")
        keep_count = sum(1 for i in items if i["verdict"] == "keep")
        vault.log_activity(
            task="skill-trim",
            outcome="✅",
            summary=f"scanned {len(items)} prompts: {compress_count} compress, {keep_count} keep",
        )
        return {
            "reply": (
                f"✂️ *Skill-Trim* — scanned {len(items)} prompts.\n\n"
                f"`{compress_count}` compressible · `{keep_count}` already tight · "
                f"`{len(items) - compress_count - keep_count}` no-win/error.\n\n"
                f"Report: `AIOS/Reports/{filename}`"
            ),
            "saved_path": saved,
            "scanned": len(items),
            "compressible": compress_count,
        }
    except Exception as exc:
        return {"reply": f"⚠️ generated report but couldn't save: {exc}"}
