"""Unit tests for aios-status. No network."""

import json
from pathlib import Path

import pytest


@pytest.fixture
def isolated(monkeypatch, tmp_path):
    state = tmp_path / "spend.json"
    monkeypatch.setenv("TRIAD_SPEND_STATE", str(state))
    import importlib
    import main
    importlib.reload(main)
    yield main, state


def test_no_spend_file(isolated):
    main, _ = isolated
    spend = main.deepseek_spend_today()
    assert spend["spent"] == 0.0
    assert spend["status"] == "ok"


def test_today_spend_present(isolated):
    main, state = isolated
    import datetime as dt
    today = dt.datetime.now().strftime("%Y-%m-%d")
    state.write_text(json.dumps({"date": today, "spend": {"deepseek": 0.30}}))
    spend = main.deepseek_spend_today()
    assert spend["spent"] == 0.30
    assert spend["status"] == "ok"


def test_soft_warn_threshold(isolated):
    main, state = isolated
    import datetime as dt
    today = dt.datetime.now().strftime("%Y-%m-%d")
    state.write_text(json.dumps({"date": today, "spend": {"deepseek": 0.80}}))
    spend = main.deepseek_spend_today()
    assert spend["status"] == "soft_warn"


def test_hard_stop_threshold(isolated):
    main, state = isolated
    import datetime as dt
    today = dt.datetime.now().strftime("%Y-%m-%d")
    state.write_text(json.dumps({"date": today, "spend": {"deepseek": 1.60}}))
    spend = main.deepseek_spend_today()
    assert spend["status"] == "hard_stop"


def test_stale_date_resets(isolated):
    main, state = isolated
    state.write_text(json.dumps({"date": "2024-01-01", "spend": {"deepseek": 5.0}}))
    spend = main.deepseek_spend_today()
    assert spend["spent"] == 0.0


def test_malformed_state_file(isolated):
    main, state = isolated
    state.write_text("not json {{{")
    spend = main.deepseek_spend_today()
    assert spend["spent"] == 0.0


def test_render_includes_bridge_status(isolated):
    main, _ = isolated
    out = main.render({"spent": 0.0, "status": "ok"}, [], bridge_ok=True)
    assert "PC bridge:" in out
    assert "healthy" in out


def test_render_marks_bridge_down(isolated):
    main, _ = isolated
    out = main.render({"spent": 0.0, "status": "ok"}, [], bridge_ok=False)
    assert "unreachable" in out


def test_render_handles_no_recent(isolated):
    main, _ = isolated
    out = main.render({"spent": 0.5, "status": "soft_warn"}, [], bridge_ok=True)
    assert "No activity log rows" in out


def test_render_shows_recent_rows(isolated):
    main, _ = isolated
    rows = [
        {"timestamp": "2026-05-26T10:30:00", "task": "voice-note", "outcome": "✅", "summary": "saved"},
    ]
    out = main.render({"spent": 0.0, "status": "ok"}, rows, bridge_ok=True)
    assert "voice-note" in out
    assert "✅" in out
