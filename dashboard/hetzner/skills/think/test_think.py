"""Unit tests for /think. No network."""

from unittest.mock import MagicMock

import pytest


@pytest.fixture
def fresh_main(monkeypatch):
    import importlib
    import main
    importlib.reload(main)
    yield main


def test_empty_input_returns_usage(fresh_main):
    main = fresh_main
    out = main.run({"text": ""})
    assert "Usage:" in out["reply"]


def test_workers_unavailable_returns_warning(fresh_main, monkeypatch):
    main = fresh_main
    monkeypatch.setattr(main, "workers", None)
    out = main.run({"text": "should I take this trade?"})
    assert "unavailable" in out["reply"].lower()


def test_calls_claude_max_with_system_prompt(fresh_main, monkeypatch):
    main = fresh_main
    fake_workers = MagicMock()
    fake_workers.dispatch.return_value = {
        "text": "## Problem\n...",
        "tokens_in": 100,
        "tokens_out": 200,
        "cost_usd": 0.0,
        "model": "claude-max",
        "fallback_used": False,
        "primary_model": "claude-max",
    }
    fake_workers.WorkerError = type("WorkerError", (RuntimeError,), {})
    monkeypatch.setattr(main, "workers", fake_workers)
    monkeypatch.setattr(main, "vault", None)  # skip logging

    out = main.run({"text": "should I take this trade?"})
    fake_workers.dispatch.assert_called_once()
    args, kwargs = fake_workers.dispatch.call_args
    assert args[0] == "claude-max"
    assert "Thinker" in kwargs["system"]
    assert "## Problem" in out["reply"]
    assert out["fallback_used"] is False


def test_fallback_note_added_when_fallback_used(fresh_main, monkeypatch):
    main = fresh_main
    fake_workers = MagicMock()
    fake_workers.dispatch.return_value = {
        "text": "## Problem\n...",
        "tokens_in": 100,
        "tokens_out": 200,
        "cost_usd": 0.0,
        "model": "gemini-flash",
        "fallback_used": True,
        "primary_model": "claude-max",
    }
    fake_workers.WorkerError = type("WorkerError", (RuntimeError,), {})
    monkeypatch.setattr(main, "workers", fake_workers)
    monkeypatch.setattr(main, "vault", None)

    out = main.run({"text": "hard question"})
    assert "fallback" in out["reply"].lower()
    assert "claude-max" in out["reply"]
    assert "gemini-flash" in out["reply"]


def test_worker_error_returns_warning(fresh_main, monkeypatch):
    main = fresh_main
    fake_workers = MagicMock()
    class _WorkerError(RuntimeError): pass
    fake_workers.WorkerError = _WorkerError
    fake_workers.dispatch.side_effect = _WorkerError("simulated failure")
    monkeypatch.setattr(main, "workers", fake_workers)
    monkeypatch.setattr(main, "vault", None)

    out = main.run({"text": "hard question"})
    assert "failed" in out["reply"].lower()
    assert "simulated failure" in out["reply"]
