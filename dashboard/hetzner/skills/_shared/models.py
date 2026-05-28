"""Worker dispatchers for the triad-router.

Each function takes a prompt + optional system message, returns:
    {
      "text": str,         # the worker's response
      "tokens_in": int,
      "tokens_out": int,
      "cost_usd": float,   # 0 for flat/free, >0 for metered
      "model": str,
    }

Network failures raise WorkerError so triad-router can fall back gracefully.
All HTTP calls go through ``_with_retry`` which retries on transient errors
(connection blips, 5xx, 429) with exponential backoff. Permanent errors
(4xx other than 429, schema errors) raise immediately so the caller can
fall back without burning the retry budget.
"""

from __future__ import annotations

import os
import time
from typing import Any, Callable, Dict, Optional, TypeVar

import requests

T = TypeVar("T")

# Retry tuning — keep total worst-case latency bounded so Hermes gateway
# doesn't time out waiting for one slow worker.
RETRY_ATTEMPTS = 3
RETRY_BASE_DELAY_S = 1.0
RETRY_MAX_DELAY_S = 8.0
RETRY_BACKOFF_FACTOR = 2.5
TRANSIENT_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}


def _with_retry(
    label: str,
    call: Callable[[], T],
    *,
    attempts: int = RETRY_ATTEMPTS,
    base_delay: float = RETRY_BASE_DELAY_S,
    max_delay: float = RETRY_MAX_DELAY_S,
    sleeper: Callable[[float], None] = time.sleep,
) -> T:
    """Run ``call`` with exponential backoff on transient HTTP failures.

    ``call`` should raise ``requests.HTTPError`` for HTTP non-2xx (the standard
    behavior of ``response.raise_for_status()``) or a generic
    ``requests.RequestException`` for connection-level errors. Permanent
    failures (4xx other than 408/425/429) re-raise immediately as WorkerError.
    """
    last_exc: Optional[BaseException] = None
    delay = base_delay
    for attempt in range(1, attempts + 1):
        try:
            return call()
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status not in TRANSIENT_STATUS_CODES:
                raise WorkerError(f"{label}: HTTP {status} (permanent)") from exc
            last_exc = exc
        except requests.RequestException as exc:
            last_exc = exc

        if attempt >= attempts:
            break
        sleeper(min(delay, max_delay))
        delay *= RETRY_BACKOFF_FACTOR

    raise WorkerError(
        f"{label}: exhausted {attempts} attempts — last error: {last_exc}"
    ) from last_exc

ECC_BRIDGE_URL = os.environ.get("ECC_BRIDGE_URL", "http://100.69.115.98:3738")
ECC_BRIDGE_TOKEN = os.environ.get("ECC_BRIDGE_TOKEN", "")

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
CEREBRAS_API_KEY = os.environ.get("CEREBRAS_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

DEFAULT_TIMEOUT = 60


class WorkerError(RuntimeError):
    """Raised when a model worker can't complete its task."""


# ──────────────────────────────────────────────────────────────────────────
# Cost tables (USD per 1M tokens)
# ──────────────────────────────────────────────────────────────────────────

COST_TABLE: Dict[str, Dict[str, float]] = {
    "deepseek":     {"in": 0.27, "out": 1.10},
    "claude-max":   {"in": 0.00, "out": 0.00},     # flat subscription
    "codex":        {"in": 0.00, "out": 0.00},     # flat subscription
    "cerebras":     {"in": 0.00, "out": 0.00},     # free tier
    "groq":         {"in": 0.00, "out": 0.00},     # free tier
    "gemini-flash": {"in": 0.00, "out": 0.00},     # free tier
}


def calculate_cost(model: str, tokens_in: int, tokens_out: int) -> float:
    table = COST_TABLE.get(model)
    if not table:
        return 0.0
    return (tokens_in * table["in"] + tokens_out * table["out"]) / 1_000_000


# ──────────────────────────────────────────────────────────────────────────
# Workers
# ──────────────────────────────────────────────────────────────────────────


def _openai_compat_call(
    url: str,
    headers: Dict[str, str],
    body: Dict[str, Any],
    *,
    model_label: str,
    cost_per_million_in: float = 0.0,
    cost_per_million_out: float = 0.0,
    timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """Shared OpenAI-compatible POST + parse used by Claude Max / DeepSeek /
    Cerebras / Groq. Wrapped in retry logic for transient failures."""

    def _do() -> Dict[str, Any]:
        response = requests.post(url, headers=headers, json=body, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        tokens_in = int(usage.get("prompt_tokens", 0))
        tokens_out = int(usage.get("completion_tokens", 0))
        cost = (tokens_in * cost_per_million_in + tokens_out * cost_per_million_out) / 1_000_000
        return {
            "text": text,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "cost_usd": cost,
            "model": model_label,
        }

    return _with_retry(f"{model_label} POST", _do)


def call_claude_max(prompt: str, system: Optional[str] = None, max_tokens: int = 2048) -> Dict[str, Any]:
    """Route to Claude Max via ECC bridge. Uses ecc/lebot-james by default."""
    if not ECC_BRIDGE_TOKEN:
        raise WorkerError("ECC_BRIDGE_TOKEN not configured")
    messages: list[Dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return _openai_compat_call(
        url=f"{ECC_BRIDGE_URL}/api/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {ECC_BRIDGE_TOKEN}",
            "Content-Type": "application/json",
        },
        body={
            "model": "ecc/lebot-james",
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": False,
        },
        model_label="claude-max",
    )


def call_deepseek(prompt: str, system: Optional[str] = None, max_tokens: int = 2048) -> Dict[str, Any]:
    """Route to DeepSeek API directly (metered)."""
    if not DEEPSEEK_API_KEY:
        raise WorkerError("DEEPSEEK_API_KEY not configured")
    messages: list[Dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return _openai_compat_call(
        url="https://api.deepseek.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json",
        },
        body={
            "model": "deepseek-chat",
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": False,
        },
        model_label="deepseek",
        cost_per_million_in=COST_TABLE["deepseek"]["in"],
        cost_per_million_out=COST_TABLE["deepseek"]["out"],
    )


def call_cerebras(prompt: str, system: Optional[str] = None, max_tokens: int = 2048) -> Dict[str, Any]:
    """Route to Cerebras free tier (very fast, llama-3.3-70b)."""
    if not CEREBRAS_API_KEY:
        raise WorkerError("CEREBRAS_API_KEY not configured")
    messages: list[Dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return _openai_compat_call(
        url="https://api.cerebras.ai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {CEREBRAS_API_KEY}",
            "Content-Type": "application/json",
        },
        body={
            "model": "llama-3.3-70b",
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": False,
        },
        model_label="cerebras",
    )


def call_groq(prompt: str, system: Optional[str] = None, max_tokens: int = 2048) -> Dict[str, Any]:
    """Route to Groq free tier (llama-3.3-70b-versatile, very fast)."""
    if not GROQ_API_KEY:
        raise WorkerError("GROQ_API_KEY not configured")
    messages: list[Dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return _openai_compat_call(
        url="https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        body={
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": False,
        },
        model_label="groq",
    )


def call_codex(prompt: str, system: Optional[str] = None, max_tokens: int = 2048) -> Dict[str, Any]:
    """Route to Codex CLI on the PC via the dashboard /api/codex endpoint.

    Codex runs as a subprocess on Windows; we can't spawn it from the Droplet.
    The dashboard proxies the call. If the PC is off (connection error), the
    retry helper will exhaust its budget then raise WorkerError with "PC off?"
    in the message — the triad-router catches that and queues for PC.
    """
    if not ECC_BRIDGE_TOKEN:
        raise WorkerError("ECC_BRIDGE_TOKEN not configured")

    def _do() -> Dict[str, Any]:
        response = requests.post(
            f"{ECC_BRIDGE_URL}/api/codex",
            headers={
                "Authorization": f"Bearer {ECC_BRIDGE_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "prompt": prompt,
                "system": system,
                "max_tokens": max_tokens,
                "timeout_ms": 60_000,
            },
            timeout=90,
        )
        if response.status_code == 503:
            raise WorkerError("codex endpoint disabled on PC (CODEX_ENABLED=false)")
        response.raise_for_status()
        payload = response.json()
        if not payload.get("success"):
            raise WorkerError(f"codex error: {payload.get('error')}")
        data = payload["data"]
        return {
            "text": data["text"],
            "tokens_in": int(data.get("tokens_in", 0)),
            "tokens_out": int(data.get("tokens_out", 0)),
            "cost_usd": 0.0,
            "model": "codex",
        }

    try:
        return _with_retry("codex POST", _do)
    except WorkerError as exc:
        # Reshape the message so triad-router recognizes the PC-off pattern
        raise WorkerError(f"codex via bridge failed (PC off?): {exc}") from exc


def call_gemini_flash(prompt: str, system: Optional[str] = None, max_tokens: int = 2048) -> Dict[str, Any]:
    """Route to Gemini 2.5 Flash free tier."""
    if not GEMINI_API_KEY:
        raise WorkerError("GEMINI_API_KEY not configured")
    # Gemini's REST API isn't OpenAI-compatible; using their generateContent endpoint.
    contents = []
    if system:
        contents.append({"role": "user", "parts": [{"text": f"System: {system}"}]})
        contents.append({"role": "model", "parts": [{"text": "Understood."}]})
    contents.append({"role": "user", "parts": [{"text": prompt}]})

    def _do() -> Dict[str, Any]:
        response = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-2.5-flash:generateContent",
            params={"key": GEMINI_API_KEY},
            json={
                "contents": contents,
                "generationConfig": {"maxOutputTokens": max_tokens},
            },
            timeout=DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        usage = data.get("usageMetadata", {})
        return {
            "text": text,
            "tokens_in": int(usage.get("promptTokenCount", 0)),
            "tokens_out": int(usage.get("candidatesTokenCount", 0)),
            "cost_usd": 0.0,
            "model": "gemini-flash",
        }

    return _with_retry("gemini-flash POST", _do)


# ──────────────────────────────────────────────────────────────────────────
# Dispatcher
# ──────────────────────────────────────────────────────────────────────────


WORKER_REGISTRY = {
    "claude-max":   call_claude_max,
    "codex":        call_codex,
    "deepseek":     call_deepseek,
    "cerebras":     call_cerebras,
    "groq":         call_groq,
    "gemini-flash": call_gemini_flash,
}

# Same-tier fallback ladders. When a primary worker fails permanently (after
# its own retry budget), the dispatcher tries each model in the ladder in
# order. Stops at the first success. Cost shape within a ladder is similar
# so fallback doesn't quietly blow up the budget.
FALLBACK_LADDERS: Dict[str, list] = {
    "claude-max":   ["gemini-flash"],           # last-resort free tier when bridge dead
    "codex":        [],                          # PC-only, no fallback
    "deepseek":     ["groq", "cerebras"],        # all bulk-capable
    "cerebras":     ["groq", "gemini-flash"],    # all free
    "groq":         ["cerebras", "gemini-flash"],
    "gemini-flash": ["groq", "cerebras"],
}


def dispatch(
    model: str,
    prompt: str,
    system: Optional[str] = None,
    *,
    allow_fallback: bool = True,
    **kwargs,
) -> Dict[str, Any]:
    """Generic dispatcher with optional cross-model fallback.

    If ``allow_fallback=True`` and the primary worker fails permanently
    (after its own retries), tries each model in ``FALLBACK_LADDERS[model]``
    in order. The returned dict includes ``fallback_used: bool`` and
    ``primary_model: str`` so callers can log + reason about routing.

    'codex' has no fallback ladder — its routing decision lives one level up
    in the triad-router (queue-for-PC pattern).
    """
    primary_fn = WORKER_REGISTRY.get(model)
    if not primary_fn:
        raise WorkerError(f"no worker registered for model '{model}'")

    try:
        result = primary_fn(prompt, system=system, **kwargs)
        result["fallback_used"] = False
        result["primary_model"] = model
        return result
    except WorkerError as primary_exc:
        if not allow_fallback:
            raise
        ladder = FALLBACK_LADDERS.get(model, [])
        last_exc: BaseException = primary_exc
        for fallback_model in ladder:
            fallback_fn = WORKER_REGISTRY.get(fallback_model)
            if not fallback_fn:
                continue
            try:
                result = fallback_fn(prompt, system=system, **kwargs)
                result["fallback_used"] = True
                result["primary_model"] = model
                result["primary_error"] = str(primary_exc)
                return result
            except WorkerError:
                continue
        raise WorkerError(
            f"{model} failed + all fallbacks exhausted ({ladder}); last error: {last_exc}"
        ) from primary_exc
