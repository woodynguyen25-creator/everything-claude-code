"""/aios-help — list installed Hermes skills with trigger + description.

Reads every `skill.yaml` under ~/.hermes/skills/ and produces a Telegram-
friendly catalog. Filters out skills that don't have a Telegram-facing
explicit `command` trigger.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, List

HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/home/hermes/.hermes"))
SKILLS_DIR = HERMES_HOME / "skills"


def parse_minimal_yaml(text: str) -> Dict[str, Any]:
    """Tiny YAML reader — handles the flat key:value / command: shape used in
    our manifests. Avoids a PyYAML dep on the Droplet."""
    result: Dict[str, Any] = {}
    description_buffer: List[str] = []
    in_description = False
    current_section: Dict[str, Any] | None = None
    current_section_key: str | None = None

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line or line.startswith("#"):
            continue

        # Top-level "key: value" or "key:" (with nested below)
        m = re.match(r"^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$", line)
        if m:
            key, value = m.group(1), m.group(2)
            if in_description:
                # Flush description
                result["description"] = " ".join(s.strip() for s in description_buffer).strip()
                description_buffer = []
                in_description = False
            if key == "description" and (value.startswith(">") or value == ""):
                in_description = True
                if value.startswith(">"):
                    rest = value[1:].strip()
                    if rest:
                        description_buffer.append(rest)
                continue
            if value == "":
                current_section = {}
                current_section_key = key
                result[key] = current_section
                continue
            result[key] = value.strip().strip('"').strip("'")
            current_section = None
            current_section_key = None
            continue

        # Indented nested key
        m = re.match(r"^\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$", line)
        if m and current_section is not None:
            current_section[m.group(1)] = m.group(2).strip().strip('"').strip("'")
            continue

        # Continuation of description block
        if in_description:
            description_buffer.append(line.strip())
            continue

    if in_description and description_buffer:
        result["description"] = " ".join(s.strip() for s in description_buffer).strip()

    return result


def collect_skills() -> List[Dict[str, str]]:
    if not SKILLS_DIR.exists():
        return []
    out: List[Dict[str, str]] = []
    for entry in sorted(SKILLS_DIR.iterdir()):
        if not entry.is_dir() or entry.name.startswith("_"):
            continue
        manifest = entry / "skill.yaml"
        if not manifest.exists():
            continue
        try:
            data = parse_minimal_yaml(manifest.read_text())
        except Exception:
            continue
        trigger = data.get("trigger", {}) if isinstance(data.get("trigger"), dict) else {}
        out.append({
            "name": data.get("name", entry.name),
            "description": str(data.get("description", "")).strip(),
            "command": trigger.get("command", ""),
            "trigger_type": trigger.get("type", "—"),
            "version": str(data.get("version", "—")),
        })
    return out


def render(skills: List[Dict[str, str]]) -> str:
    explicit = [s for s in skills if s.get("trigger_type") == "explicit"]
    other = [s for s in skills if s.get("trigger_type") != "explicit"]

    lines: List[str] = []
    lines.append("📚 *Hermes — skill catalog*")
    lines.append("")
    if explicit:
        lines.append("*Commands you can send:*")
        for s in explicit:
            cmd = s.get("command") or f"/{s['name']}"
            desc = s["description"]
            if len(desc) > 110:
                desc = desc[:107] + "..."
            lines.append(f"• `{cmd}` — {desc}")
        lines.append("")
    if other:
        lines.append("*Event-triggered (no manual command):*")
        for s in other:
            desc = s["description"]
            if len(desc) > 110:
                desc = desc[:107] + "..."
            lines.append(f"• `{s['name']}` ({s['trigger_type']}) — {desc}")
    if not skills:
        lines.append("_No skills found in ~/.hermes/skills/._")
    return "\n".join(lines)


def help(event: Dict[str, Any] | None = None) -> Dict[str, Any]:
    skills = collect_skills()
    return {
        "reply": render(skills),
        "skill_count": len(skills),
        "explicit_count": sum(1 for s in skills if s.get("trigger_type") == "explicit"),
    }
