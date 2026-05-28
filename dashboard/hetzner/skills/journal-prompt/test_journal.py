"""Unit tests for /journal. No network."""

import pytest


@pytest.fixture
def fresh_main(monkeypatch):
    import importlib
    import main
    importlib.reload(main)
    monkeypatch.setattr(main, "vault", None)
    yield main


def test_workers_unavailable(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "workers", None)
    out = fresh_main.run({"text": ""})
    assert "unavailable" in out["reply"].lower()


def test_gather_signal_returns_empty_without_vault(fresh_main):
    signal = fresh_main.gather_signal()
    assert signal["activity_rows"] == []
    assert "fetched_at" in signal


def test_build_signal_block_empty(fresh_main):
    signal = {"activity_rows": [], "today_voice_notes": [], "errors_today": []}
    out = fresh_main.build_signal_block(signal)
    assert "quiet day" in out.lower() or "no activity" in out.lower()


def test_build_signal_block_groups_by_task(fresh_main):
    signal = {
        "activity_rows": [
            {"ts": "10:00", "task": "voice-note", "outcome": "✅", "summary": "s", "notes": ""},
            {"ts": "11:00", "task": "voice-note", "outcome": "✅", "summary": "s", "notes": ""},
            {"ts": "12:00", "task": "triad-router", "outcome": "✅", "summary": "s", "notes": ""},
        ],
        "today_voice_notes": [],
        "errors_today": [],
    }
    out = fresh_main.build_signal_block(signal)
    assert "voice-note × 2" in out
    assert "triad-router × 1" in out


def test_build_signal_block_surfaces_errors(fresh_main):
    signal = {
        "activity_rows": [
            {"ts": "09:00", "task": "morning-brief", "outcome": "❌", "summary": "s", "notes": "API rate limit"},
        ],
        "today_voice_notes": [],
        "errors_today": [
            {"ts": "09:00", "task": "morning-brief", "outcome": "❌", "summary": "s", "notes": "API rate limit"},
        ],
    }
    out = fresh_main.build_signal_block(signal)
    assert "Friction" in out
    assert "morning-brief" in out


def test_build_signal_block_notes_voice_capture(fresh_main):
    signal = {
        "activity_rows": [
            {"ts": "10:00", "task": "voice-note", "outcome": "✅", "summary": "s", "notes": ""},
        ],
        "today_voice_notes": ["Trading Assistant/Voice Notes/voice-X.md", "_inbox/voice-Y.md"],
        "errors_today": [],
    }
    out = fresh_main.build_signal_block(signal)
    assert "Voice notes captured: 2" in out


def test_run_with_save_flag_attempts_save(fresh_main, monkeypatch):
    class FakeWorkers:
        class WorkerError(RuntimeError): pass
        @staticmethod
        def dispatch(*_a, **_kw):
            return {
                "text": "## One observation\n\nfoo\n\n## Two questions\n\n1. q?\n2. q?",
                "tokens_in": 100, "tokens_out": 50, "cost_usd": 0.0, "model": "claude-max",
                "fallback_used": False, "primary_model": "claude-max",
            }
    monkeypatch.setattr(fresh_main, "workers", FakeWorkers)
    out = fresh_main.run({"text": "--save"})
    assert "Evening reflection" in out["reply"]
    # vault is None, so saved_path will be None and message says vault unreachable
    assert "vault unreachable" in out["reply"] or "Saved" in out["reply"]


def test_run_without_save_flag(fresh_main, monkeypatch):
    class FakeWorkers:
        class WorkerError(RuntimeError): pass
        @staticmethod
        def dispatch(*_a, **_kw):
            return {
                "text": "the prompt",
                "tokens_in": 10, "tokens_out": 5, "cost_usd": 0.0, "model": "claude-max",
                "fallback_used": False, "primary_model": "claude-max",
            }
    monkeypatch.setattr(fresh_main, "workers", FakeWorkers)
    out = fresh_main.run({"text": ""})
    assert "Evening reflection" in out["reply"]
    assert out["saved_path"] is None
