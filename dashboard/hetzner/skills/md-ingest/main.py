"""/md-ingest — PDF/HTML/DOCX -> markdown via PC docling CLI.

Telegram usage:
  /md-ingest <path or URL>

For files: Woody drops the file in PC's `~/.aios/ingest-inbox/` then sends
the filename via Telegram. Hermes asks the PC to convert it. Result lands
in the vault at `AIOS/ingest/<YYYY-MM-DD>/<basename>.md`.

For URLs: works directly via Hermes — uses requests to fetch HTML, then
posts content to dashboard /api/ingest/markdown for conversion.

This skill assumes the PC has the dashboard `/api/ingest/markdown` route
serving as a docling wrapper. If that route doesn't exist yet the skill
falls back to a simple text-strip for HTML (PDF/DOCX will fail clearly).
"""

from __future__ import annotations

import datetime as _dt
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import vault  # type: ignore
except ImportError:
    vault = None

BRIDGE_URL = os.environ.get("ECC_BRIDGE_URL", "http://100.69.115.98:3738")
BRIDGE_TOKEN = os.environ.get("ECC_BRIDGE_TOKEN", "")


def fetch_url(url: str) -> str:
    response = requests.get(url, timeout=30, headers={"User-Agent": "Hermes-md-ingest/0.1"})
    response.raise_for_status()
    return response.text


def crude_html_to_text(html: str) -> str:
    """Last-resort fallback when docling isn't available. Loses structure."""
    body = re.sub(r"<script.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<style.*?</style>", "", body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<[^>]+>", "\n", body)
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip()


def convert_via_pc(source_kind: str, payload: Dict[str, str]) -> str:
    """POST to /api/ingest/markdown on PC. Returns converted markdown."""
    if not BRIDGE_TOKEN:
        raise RuntimeError("ECC_BRIDGE_TOKEN not configured")
    response = requests.post(
        f"{BRIDGE_URL}/api/ingest/markdown",
        headers={
            "Authorization": f"Bearer {BRIDGE_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"source_kind": source_kind, **payload},
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    if not data.get("success"):
        raise RuntimeError(f"docling error: {data.get('error')}")
    return data["data"]["markdown"]


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9-_]+", "-", text.strip()).strip("-")
    return s[:80].lower() or "untitled"


def run(event: Dict[str, Any]) -> Dict[str, Any]:
    arg = (event.get("text") or "").strip()
    if not arg:
        return {"reply": "Usage: `/md-ingest <url or PC file path>`"}

    is_url = arg.startswith(("http://", "https://"))
    today = _dt.datetime.now().strftime("%Y-%m-%d")
    folder = f"AIOS/ingest/{today}"

    if is_url:
        try:
            markdown = convert_via_pc("url", {"url": arg})
        except Exception as exc_primary:
            # Fallback: crude HTML strip
            try:
                html = fetch_url(arg)
                markdown = crude_html_to_text(html)
                markdown = f"> Converted with crude fallback (docling unavailable: {exc_primary})\n\n{markdown}"
            except Exception as exc_fallback:
                return {"reply": f"❌ couldn't ingest URL: {exc_fallback}"}
        basename = slugify(arg.split("/")[-1] or "url")
        filename = f"{basename}.md"
    else:
        try:
            markdown = convert_via_pc("file", {"path": arg})
        except Exception as exc:
            return {
                "reply": (
                    f"❌ PC docling failed: {exc}\n\n"
                    "If `docling` isn't installed: `winget install docling` on PC, then retry."
                )
            }
        basename = slugify(Path(arg).stem)
        filename = f"{basename}.md"

    if vault is None:
        return {"reply": f"⚠️ vault unavailable; converted but couldn't save. {len(markdown)} chars"}

    try:
        full_path = vault.write(folder, filename, markdown, mode="overwrite")
        vault.log_activity(
            task="md-ingest",
            outcome="✅",
            summary=f"ingested {arg[:60]}",
            notes=f"saved={full_path} chars={len(markdown)}",
        )
        return {
            "reply": f"✅ Ingested to `{folder}/{filename}` ({len(markdown):,} chars)",
            "saved_path": full_path,
            "char_count": len(markdown),
        }
    except Exception as exc:
        return {"reply": f"⚠️ converted but couldn't save: {exc}"}
