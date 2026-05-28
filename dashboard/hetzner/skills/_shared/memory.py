"""Memory tier helpers for Hermes skills.

Pattern from AI Masterclass video #21 (204 AI Automations / context engineering).

Three tiers:
  - Working memory     — per-skill, single execution. Just a dict.
  - Short-term memory  — per-chat_id, persists across messages within a session.
                         JSON file on Droplet, keyed by chat_id.
  - Long-term memory   — persists across sessions and devices. Lives in the
                         vault via the ECC bridge (SOUL.md, AIOS/Memory/*.md,
                         AIOS/AIOS-ACTIVITY-LOG.md).

Skills should pull from each tier appropriately and avoid duplicating state.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional


SHORT_TERM_DIR = Path(os.environ.get("HERMES_MEMORY_DIR", "/home/hermes/.hermes/state/memory"))
SHORT_TERM_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days


# ──────────────────────────────────────────────────────────────────────────
# Working memory — in-process dict, ephemeral
# ──────────────────────────────────────────────────────────────────────────

@dataclass
class WorkingMemory:
    """A simple key-value scratchpad for one skill invocation."""
    data: Dict[str, Any]

    @classmethod
    def empty(cls) -> "WorkingMemory":
        return cls(data={})

    def get(self, key: str, default: Any = None) -> Any:
        return self.data.get(key, default)

    def set(self, key: str, value: Any) -> None:
        self.data[key] = value

    def all(self) -> Dict[str, Any]:
        return dict(self.data)


# ──────────────────────────────────────────────────────────────────────────
# Short-term memory — per-chat_id JSON file
# ──────────────────────────────────────────────────────────────────────────

def _short_term_path(chat_id: int | str) -> Path:
    return SHORT_TERM_DIR / f"chat-{chat_id}.json"


def short_term_load(chat_id: int | str) -> Dict[str, Any]:
    """Load short-term memory for one chat. Returns empty dict if missing or stale."""
    path = _short_term_path(chat_id)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return {}

    written_at = data.get("_written_at", 0)
    if time.time() - written_at > SHORT_TERM_TTL_SECONDS:
        # Stale — let it get overwritten next save, but don't return its contents.
        return {}
    return data.get("payload", {})


def short_term_save(chat_id: int | str, payload: Dict[str, Any]) -> None:
    """Persist short-term memory for one chat. Overwrites prior payload."""
    SHORT_TERM_DIR.mkdir(parents=True, exist_ok=True)
    _short_term_path(chat_id).write_text(
        json.dumps({"_written_at": time.time(), "payload": payload}, indent=2)
    )


def short_term_update(chat_id: int | str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Read-modify-write convenience. Returns the merged payload."""
    current = short_term_load(chat_id)
    current.update(updates)
    short_term_save(chat_id, current)
    return current


def short_term_clear(chat_id: int | str) -> bool:
    """Remove the short-term memory file. Returns True if a file was removed."""
    path = _short_term_path(chat_id)
    if path.exists():
        path.unlink()
        return True
    return False


# ──────────────────────────────────────────────────────────────────────────
# Long-term memory — vault-backed, see _shared.vault
# ──────────────────────────────────────────────────────────────────────────


def long_term_pointer(domain: str) -> str:
    """Return the canonical vault path for a given memory domain.

    Domains map 1:1 to AIOS/Memory/<name>.md so skills can write consistent
    references back to Telegram replies, e.g. "see [[AIOS/Memory/trading]]".
    """
    safe = "".join(c for c in domain if c.isalnum() or c in "-_").lower() or "general"
    return f"AIOS/Memory/{safe}.md"
