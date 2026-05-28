"""Shared vault I/O helpers used by Hermes skills and cron scripts.

All vault writes go through the ECC bridge — no skill talks to the filesystem
directly. This keeps auth + path-traversal guards centralized on the dashboard.
"""

from __future__ import annotations

import datetime as _dt
import os
from typing import Any, Dict, Optional

import requests

BRIDGE_URL = os.environ.get("ECC_BRIDGE_URL", "http://100.69.115.98:3738")
BRIDGE_TOKEN = os.environ.get("ECC_BRIDGE_TOKEN", "")
DEFAULT_TIMEOUT = 15


class VaultBridgeError(RuntimeError):
    """Raised when the bridge rejects a request or is unreachable."""


def _headers() -> Dict[str, str]:
    if not BRIDGE_TOKEN:
        raise VaultBridgeError("ECC_BRIDGE_TOKEN env var is not set")
    return {
        "Authorization": f"Bearer {BRIDGE_TOKEN}",
        "Content-Type": "application/json",
    }


def write(folder: str, filename: str, content: str, mode: str = "create") -> str:
    """POST /api/vault/write. Returns the absolute saved path on success."""
    response = requests.post(
        f"{BRIDGE_URL}/api/vault/write",
        headers=_headers(),
        json={"folder": folder, "filename": filename, "content": content, "mode": mode},
        timeout=DEFAULT_TIMEOUT,
    )
    if not response.ok:
        raise VaultBridgeError(f"write failed: {response.status_code} {response.text[:200]}")
    payload = response.json()
    if not payload.get("success"):
        raise VaultBridgeError(f"write error: {payload.get('error')}")
    return payload["data"]["path"]


def read(folder: str, filename: str) -> str:
    """GET /api/vault/read. Returns the file content. Raises VaultBridgeError on 404."""
    response = requests.get(
        f"{BRIDGE_URL}/api/vault/read",
        headers=_headers(),
        params={"folder": folder, "filename": filename},
        timeout=DEFAULT_TIMEOUT,
    )
    if response.status_code == 404:
        raise VaultBridgeError(f"not found: {folder}/{filename}")
    if not response.ok:
        raise VaultBridgeError(f"read failed: {response.status_code} {response.text[:200]}")
    payload = response.json()
    if not payload.get("success"):
        raise VaultBridgeError(f"read error: {payload.get('error')}")
    return payload["data"]["content"]


def list_entries(
    folder: str = "",
    glob: str = "*.md",
    recursive: bool = False,
    limit: int = 500,
) -> list[Dict[str, Any]]:
    """GET /api/vault/list. Returns a list of entries sorted newest-first."""
    response = requests.get(
        f"{BRIDGE_URL}/api/vault/list",
        headers=_headers(),
        params={
            "folder": folder,
            "glob": glob,
            "recursive": "true" if recursive else "false",
            "limit": str(limit),
        },
        timeout=DEFAULT_TIMEOUT,
    )
    if not response.ok:
        raise VaultBridgeError(f"list failed: {response.status_code} {response.text[:200]}")
    payload = response.json()
    if not payload.get("success"):
        raise VaultBridgeError(f"list error: {payload.get('error')}")
    return payload["data"]["entries"]


# ──────────────────────────────────────────────────────────────────────────
# Convenience: append a row to AIOS-ACTIVITY-LOG.md
# ──────────────────────────────────────────────────────────────────────────


def log_activity(
    task: str,
    outcome: str,
    summary: str,
    *,
    tokens: Optional[int] = None,
    cost_usd: Optional[float] = None,
    notes: str = "",
) -> None:
    """Append one row to AIOS/AIOS-ACTIVITY-LOG.md via the bridge.

    Outcome should be one of: ✅, ⚠️, ❌, 🔁.
    """
    timestamp = _dt.datetime.now().isoformat(timespec="seconds")
    tokens_str = str(tokens) if tokens is not None else ""
    cost_str = f"{cost_usd:.4f}" if cost_usd is not None else ""
    row = (
        f"| {timestamp} | {task} | {outcome} | "
        f"{summary.replace('|', '\\|')[:200]} | {tokens_str} | {cost_str} | "
        f"{notes.replace('|', '\\|')[:200]} |\n"
    )
    # Append-mode write on a markdown table — the existing file already has the header rows.
    write(
        folder="AIOS",
        filename="AIOS-ACTIVITY-LOG.md",
        content=row,
        mode="append",
    )


# ──────────────────────────────────────────────────────────────────────────
# Health check helper
# ──────────────────────────────────────────────────────────────────────────


def bridge_healthy() -> bool:
    """Returns True if /api/vault/write GET endpoint responds with success."""
    try:
        response = requests.get(
            f"{BRIDGE_URL}/api/vault/write",
            timeout=5,
        )
        return response.ok and response.json().get("success", False)
    except (requests.RequestException, ValueError):
        return False
