"""Unit tests for /classify. No network."""

import pytest


@pytest.fixture
def fresh_main(monkeypatch):
    import importlib
    import main
    importlib.reload(main)
    monkeypatch.setattr(main, "vault", None)  # skip logging
    yield main


def test_empty_input_returns_usage(fresh_main):
    out = fresh_main.run({"text": ""})
    assert "Usage:" in out["reply"]


def test_heuristic_classifies_urgent(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "workers", None)  # force heuristic
    out = fresh_main.run({"text": "asap need to act on this"})
    assert out["tier"] == "urgent"


def test_heuristic_classifies_action(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "workers", None)
    out = fresh_main.run({"text": "build me a thing for the dashboard"})
    assert out["tier"] == "action"


def test_heuristic_classifies_noise(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "workers", None)
    out = fresh_main.run({"text": "oops nvm"})
    assert out["tier"] == "noise"


def test_heuristic_default_is_informational(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "workers", None)
    out = fresh_main.run({"text": "interesting thought about lotus shaders"})
    assert out["tier"] == "informational"


def test_slash_command_routed_as_action(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "workers", None)
    out = fresh_main.run({"text": "/triad ultrathink something"})
    assert out["tier"] == "action"


def test_parse_classification_handles_fences(fresh_main):
    main = fresh_main
    text = '```json\n{"tier":"action","reason":"build request","recommended_skill":"/triad","confidence":0.9}\n```'
    parsed = main._parse_classification_json(text)
    assert parsed is not None
    assert parsed["tier"] == "action"
    assert parsed["confidence"] == 0.9


def test_parse_classification_handles_no_fences(fresh_main):
    main = fresh_main
    text = '{"tier":"urgent","reason":"market move","recommended_skill":"/aios-status","confidence":0.8}'
    parsed = main._parse_classification_json(text)
    assert parsed["tier"] == "urgent"


def test_parse_classification_rejects_invalid_tier(fresh_main):
    main = fresh_main
    text = '{"tier":"wrong","reason":"r","recommended_skill":"_save","confidence":0.5}'
    assert main._parse_classification_json(text) is None


def test_parse_classification_rejects_malformed_json(fresh_main):
    main = fresh_main
    assert main._parse_classification_json("not json") is None


def test_render_reply_includes_emoji(fresh_main):
    out = fresh_main.render_reply(
        {"tier": "urgent", "reason": "now", "recommended_skill": "/aios-status",
         "confidence": 0.9, "model": "heuristic"},
        "test msg",
    )
    assert "🚨" in out
    assert "URGENT" in out
