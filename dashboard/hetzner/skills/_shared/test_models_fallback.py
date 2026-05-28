"""Tests for cross-model fallback in dispatch(). No network."""

from typing import Any, Dict
from unittest.mock import MagicMock

import pytest

import models


def make_worker(name: str, response_text: str = "ok"):
    def worker(prompt: str, system: Any = None, **_kwargs) -> Dict[str, Any]:
        return {
            "text": response_text,
            "tokens_in": 10,
            "tokens_out": 5,
            "cost_usd": 0.0,
            "model": name,
        }
    return worker


def make_failing_worker(name: str):
    def worker(prompt: str, system: Any = None, **_kwargs) -> Dict[str, Any]:
        raise models.WorkerError(f"{name}: simulated failure")
    return worker


@pytest.fixture
def fresh_registry(monkeypatch):
    """Snapshot + restore the registry for each test."""
    original = dict(models.WORKER_REGISTRY)
    yield
    models.WORKER_REGISTRY.clear()
    models.WORKER_REGISTRY.update(original)


def test_dispatch_returns_primary_when_it_works(fresh_registry):
    models.WORKER_REGISTRY["deepseek"] = make_worker("deepseek")
    result = models.dispatch("deepseek", "hi")
    assert result["model"] == "deepseek"
    assert result["fallback_used"] is False
    assert result["primary_model"] == "deepseek"


def test_dispatch_falls_back_when_primary_fails(fresh_registry):
    models.WORKER_REGISTRY["deepseek"] = make_failing_worker("deepseek")
    models.WORKER_REGISTRY["groq"] = make_worker("groq")
    result = models.dispatch("deepseek", "hi")
    assert result["model"] == "groq"
    assert result["fallback_used"] is True
    assert result["primary_model"] == "deepseek"
    assert "primary_error" in result
    assert "deepseek" in result["primary_error"]


def test_dispatch_tries_second_fallback_when_first_also_fails(fresh_registry):
    models.WORKER_REGISTRY["deepseek"] = make_failing_worker("deepseek")
    models.WORKER_REGISTRY["groq"] = make_failing_worker("groq")
    models.WORKER_REGISTRY["cerebras"] = make_worker("cerebras")
    result = models.dispatch("deepseek", "hi")
    assert result["model"] == "cerebras"
    assert result["fallback_used"] is True


def test_dispatch_raises_when_all_fallbacks_exhausted(fresh_registry):
    models.WORKER_REGISTRY["deepseek"] = make_failing_worker("deepseek")
    models.WORKER_REGISTRY["groq"] = make_failing_worker("groq")
    models.WORKER_REGISTRY["cerebras"] = make_failing_worker("cerebras")
    with pytest.raises(models.WorkerError) as exc:
        models.dispatch("deepseek", "hi")
    assert "exhausted" in str(exc.value)


def test_dispatch_no_fallback_for_codex(fresh_registry):
    models.WORKER_REGISTRY["codex"] = make_failing_worker("codex")
    # codex has empty fallback ladder
    with pytest.raises(models.WorkerError):
        models.dispatch("codex", "hi")


def test_dispatch_respects_allow_fallback_false(fresh_registry):
    models.WORKER_REGISTRY["deepseek"] = make_failing_worker("deepseek")
    models.WORKER_REGISTRY["groq"] = make_worker("groq")
    with pytest.raises(models.WorkerError):
        models.dispatch("deepseek", "hi", allow_fallback=False)


def test_dispatch_unknown_model_raises(fresh_registry):
    with pytest.raises(models.WorkerError) as exc:
        models.dispatch("not-a-model", "hi")
    assert "no worker registered" in str(exc.value)


def test_fallback_does_not_log_cost_for_free_tier(fresh_registry):
    models.WORKER_REGISTRY["deepseek"] = make_failing_worker("deepseek")
    models.WORKER_REGISTRY["groq"] = make_worker("groq")
    result = models.dispatch("deepseek", "hi")
    assert result["cost_usd"] == 0.0  # groq is free


def test_fallback_ladder_for_claude_max():
    # Sanity: claude-max should fall back to gemini-flash (free, last resort)
    assert models.FALLBACK_LADDERS["claude-max"] == ["gemini-flash"]


def test_fallback_ladder_for_deepseek():
    # deepseek should fall back to other bulk-capable workers
    ladder = models.FALLBACK_LADDERS["deepseek"]
    assert "groq" in ladder
    assert "cerebras" in ladder
