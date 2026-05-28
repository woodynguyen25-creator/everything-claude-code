"""Tests for the individual worker functions in models.py. No network.

Each test mocks the requests.post / requests.request layer so we exercise
the actual worker code (URL, headers, body construction, response parsing)
without hitting any real provider.
"""

from __future__ import annotations

from typing import Any, Dict
from unittest.mock import MagicMock, patch

import pytest

import models


# ──────────────────────────────────────────────────────────────────────────
# Test fixtures
# ──────────────────────────────────────────────────────────────────────────


def make_response(json_body: Dict[str, Any], status_code: int = 200) -> MagicMock:
    """Build a mock requests.Response that behaves correctly."""
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = json_body
    if 200 <= status_code < 300:
        mock.raise_for_status = MagicMock()
    else:
        mock.raise_for_status = MagicMock(side_effect=__import__("requests").HTTPError(
            f"HTTP {status_code}", response=mock
        ))
    return mock


def openai_compat_body(text: str = "hello world", tokens_in: int = 100, tokens_out: int = 50) -> Dict[str, Any]:
    return {
        "choices": [{"message": {"content": text}}],
        "usage": {"prompt_tokens": tokens_in, "completion_tokens": tokens_out},
    }


# ──────────────────────────────────────────────────────────────────────────
# call_claude_max
# ──────────────────────────────────────────────────────────────────────────


def test_claude_max_requires_bridge_token(monkeypatch):
    monkeypatch.setattr(models, "ECC_BRIDGE_TOKEN", "")
    with pytest.raises(models.WorkerError, match="ECC_BRIDGE_TOKEN"):
        models.call_claude_max("hello")


def test_claude_max_calls_bridge_with_lebot_model(monkeypatch):
    monkeypatch.setattr(models, "ECC_BRIDGE_TOKEN", "test-token")
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response(openai_compat_body("synthesized text"))
        result = models.call_claude_max("hello", system="be brief")

    assert result["text"] == "synthesized text"
    assert result["model"] == "claude-max"
    assert result["cost_usd"] == 0.0
    assert result["tokens_in"] == 100
    assert result["tokens_out"] == 50

    call_args = mock_post.call_args
    url = call_args[0][0]
    assert "/api/openai/v1/chat/completions" in url
    assert call_args.kwargs["headers"]["Authorization"] == "Bearer test-token"
    body = call_args.kwargs["json"]
    assert body["model"] == "ecc/lebot-james"
    assert body["messages"][0]["role"] == "system"
    assert body["messages"][1]["role"] == "user"


def test_claude_max_no_system_message(monkeypatch):
    monkeypatch.setattr(models, "ECC_BRIDGE_TOKEN", "test-token")
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response(openai_compat_body())
        models.call_claude_max("just user")
    body = mock_post.call_args.kwargs["json"]
    assert len(body["messages"]) == 1
    assert body["messages"][0]["role"] == "user"


# ──────────────────────────────────────────────────────────────────────────
# call_deepseek
# ──────────────────────────────────────────────────────────────────────────


def test_deepseek_requires_api_key(monkeypatch):
    monkeypatch.setattr(models, "DEEPSEEK_API_KEY", "")
    with pytest.raises(models.WorkerError, match="DEEPSEEK_API_KEY"):
        models.call_deepseek("hello")


def test_deepseek_calculates_metered_cost(monkeypatch):
    monkeypatch.setattr(models, "DEEPSEEK_API_KEY", "ds-key")
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response(openai_compat_body("bulk", tokens_in=1_000_000, tokens_out=500_000))
        result = models.call_deepseek("generate stuff")

    assert result["model"] == "deepseek"
    # Expected: 1M input @ $0.27/M + 0.5M output @ $1.10/M = 0.27 + 0.55 = 0.82
    assert result["cost_usd"] == pytest.approx(0.82, abs=0.01)
    assert mock_post.call_args[0][0] == "https://api.deepseek.com/v1/chat/completions"


def test_deepseek_zero_tokens_zero_cost(monkeypatch):
    monkeypatch.setattr(models, "DEEPSEEK_API_KEY", "ds-key")
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response(openai_compat_body(tokens_in=0, tokens_out=0))
        result = models.call_deepseek("x")
    assert result["cost_usd"] == 0.0


# ──────────────────────────────────────────────────────────────────────────
# call_cerebras / call_groq (OpenAI-compat free tiers)
# ──────────────────────────────────────────────────────────────────────────


def test_cerebras_requires_key(monkeypatch):
    monkeypatch.setattr(models, "CEREBRAS_API_KEY", "")
    with pytest.raises(models.WorkerError, match="CEREBRAS_API_KEY"):
        models.call_cerebras("hello")


def test_cerebras_uses_llama_model(monkeypatch):
    monkeypatch.setattr(models, "CEREBRAS_API_KEY", "cb-key")
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response(openai_compat_body("fast scan"))
        result = models.call_cerebras("scan this")
    body = mock_post.call_args.kwargs["json"]
    assert "llama" in body["model"].lower()
    assert result["model"] == "cerebras"
    assert result["cost_usd"] == 0.0


def test_groq_requires_key(monkeypatch):
    monkeypatch.setattr(models, "GROQ_API_KEY", "")
    with pytest.raises(models.WorkerError, match="GROQ_API_KEY"):
        models.call_groq("hello")


def test_groq_uses_versatile_model(monkeypatch):
    monkeypatch.setattr(models, "GROQ_API_KEY", "groq-key")
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response(openai_compat_body())
        result = models.call_groq("scan")
    body = mock_post.call_args.kwargs["json"]
    assert "versatile" in body["model"].lower()
    assert result["model"] == "groq"


# ──────────────────────────────────────────────────────────────────────────
# call_gemini_flash (non-OpenAI-compat)
# ──────────────────────────────────────────────────────────────────────────


def test_gemini_requires_key(monkeypatch):
    monkeypatch.setattr(models, "GEMINI_API_KEY", "")
    with pytest.raises(models.WorkerError, match="GEMINI_API_KEY"):
        models.call_gemini_flash("hello")


def test_gemini_uses_generate_content_endpoint(monkeypatch):
    monkeypatch.setattr(models, "GEMINI_API_KEY", "gm-key")
    gemini_response = {
        "candidates": [{"content": {"parts": [{"text": "critique result"}]}}],
        "usageMetadata": {"promptTokenCount": 50, "candidatesTokenCount": 30},
    }
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response(gemini_response)
        result = models.call_gemini_flash("critique this", system="be harsh")

    assert result["text"] == "critique result"
    assert result["model"] == "gemini-flash"
    assert result["tokens_in"] == 50
    assert result["tokens_out"] == 30
    url = mock_post.call_args[0][0]
    assert "generativelanguage.googleapis.com" in url
    assert "gemini-2.5-flash" in url
    assert mock_post.call_args.kwargs["params"]["key"] == "gm-key"


# ──────────────────────────────────────────────────────────────────────────
# call_codex (subprocess via bridge)
# ──────────────────────────────────────────────────────────────────────────


def test_codex_requires_bridge_token(monkeypatch):
    monkeypatch.setattr(models, "ECC_BRIDGE_TOKEN", "")
    with pytest.raises(models.WorkerError, match="ECC_BRIDGE_TOKEN"):
        models.call_codex("hello")


def test_codex_503_means_disabled(monkeypatch):
    monkeypatch.setattr(models, "ECC_BRIDGE_TOKEN", "tok")
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response({}, status_code=503)
        with pytest.raises(models.WorkerError, match="disabled"):
            models.call_codex("hello")


def test_codex_pc_off_pattern(monkeypatch):
    """When the bridge POST fails with a connection error, the error message
    should include 'PC off?' so triad-router can recognize and queue."""
    monkeypatch.setattr(models, "ECC_BRIDGE_TOKEN", "tok")
    import requests as real_requests
    with patch("models.requests.post") as mock_post:
        mock_post.side_effect = real_requests.ConnectionError("connection refused")
        with pytest.raises(models.WorkerError, match="PC off"):
            models.call_codex("hello")


def test_codex_success_returns_text(monkeypatch):
    monkeypatch.setattr(models, "ECC_BRIDGE_TOKEN", "tok")
    bridge_response = {
        "success": True,
        "data": {
            "text": "def foo(): return 1\n",
            "tokens_in": 80,
            "tokens_out": 20,
        },
    }
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response(bridge_response)
        result = models.call_codex("write a fn")
    assert result["model"] == "codex"
    assert "def foo" in result["text"]
    assert result["cost_usd"] == 0.0


def test_codex_bridge_error_payload(monkeypatch):
    monkeypatch.setattr(models, "ECC_BRIDGE_TOKEN", "tok")
    bridge_response = {"success": False, "error": "codex spawn failed"}
    with patch("models.requests.post") as mock_post:
        mock_post.return_value = make_response(bridge_response)
        with pytest.raises(models.WorkerError, match="codex"):
            models.call_codex("hello")


# ──────────────────────────────────────────────────────────────────────────
# Sanity: registry + cost table
# ──────────────────────────────────────────────────────────────────────────


def test_registry_contains_all_workers():
    expected = {"claude-max", "codex", "deepseek", "cerebras", "groq", "gemini-flash"}
    assert set(models.WORKER_REGISTRY.keys()) == expected


def test_cost_table_only_deepseek_metered():
    assert models.COST_TABLE["deepseek"]["in"] > 0
    assert models.COST_TABLE["deepseek"]["out"] > 0
    for free_model in ["claude-max", "codex", "cerebras", "groq", "gemini-flash"]:
        assert models.COST_TABLE[free_model]["in"] == 0.0
        assert models.COST_TABLE[free_model]["out"] == 0.0


def test_calculate_cost_unknown_model_returns_zero():
    assert models.calculate_cost("made-up", 1_000_000, 1_000_000) == 0.0
