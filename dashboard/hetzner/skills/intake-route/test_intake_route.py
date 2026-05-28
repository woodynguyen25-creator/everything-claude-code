"""Unit tests for /route. No network."""

import pytest


@pytest.fixture
def fresh_main(monkeypatch):
    import importlib
    import main
    importlib.reload(main)
    monkeypatch.setattr(main, "vault", None)
    yield main


def test_empty_input_returns_usage(fresh_main):
    out = fresh_main.run({"text": ""})
    assert "Usage:" in out["reply"]


def test_classifier_unavailable(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "classifier", None)
    out = fresh_main.run({"text": "any message"})
    assert "not installed" in out["reply"].lower() or "can't route" in out["reply"].lower()


def test_render_urgent(fresh_main):
    out = fresh_main.render_urgent(
        "market crashed",
        {"reason": "time-critical", "recommended_skill": "/aios-status"},
    )
    assert "🚨" in out
    assert "URGENT" in out
    assert "market crashed" in out


def test_render_action_includes_invocation(fresh_main):
    out = fresh_main.render_action(
        "build a weather skill",
        {"reason": "build request", "recommended_skill": "/triad", "confidence": 0.85},
    )
    assert "ACTION" in out
    assert "📋" in out
    assert "/triad" in out
    assert "85%" in out


def test_render_informational_with_path(fresh_main):
    out = fresh_main.render_informational(
        "interesting thought",
        {"reason": "no action"},
        "_inbox/intake-X.md",
    )
    assert "INFORMATIONAL" in out
    assert "📥" in out
    assert "_inbox/intake-X.md" in out


def test_render_informational_without_path(fresh_main):
    out = fresh_main.render_informational(
        "thought", {"reason": "x"}, None,
    )
    assert "couldn't save" in out


def test_render_noise(fresh_main):
    out = fresh_main.render_noise()
    assert "🗑️" in out
    assert "ignored" in out


def test_route_uses_classifier_tier(fresh_main, monkeypatch):
    class FakeClassifier:
        @staticmethod
        def classify(message):
            return {
                "tier": "action",
                "reason": "build request",
                "recommended_skill": "/triad",
                "confidence": 0.9,
                "model": "heuristic",
            }

    monkeypatch.setattr(fresh_main, "classifier", FakeClassifier)
    out = fresh_main.run({"text": "build me a thing"})
    assert out["tier"] == "action"
    assert "ACTION" in out["reply"]
