"""Unit tests for /workflow-or-agent. No network."""

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


def test_evaluate_without_workers_returns_error(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "workers", None)
    result = fresh_main.evaluate("any problem")
    assert "error" in result


def test_parse_json_fenced(fresh_main):
    raw = '```json\n{"verdict":"WORKFLOW","scores":{"determinism":2,"tool_variability":1,"reasoning_depth":1},"total":4,"reasoning":"r","build_advice":"a"}\n```'
    parsed = fresh_main._parse_json(raw)
    assert parsed is not None
    assert parsed["verdict"] == "WORKFLOW"


def test_parse_json_unfenced(fresh_main):
    raw = '{"verdict":"AGENT","scores":{"determinism":4,"tool_variability":4,"reasoning_depth":5},"total":13,"reasoning":"r","build_advice":"a"}'
    parsed = fresh_main._parse_json(raw)
    assert parsed["verdict"] == "AGENT"


def test_parse_json_missing_verdict(fresh_main):
    raw = '{"scores":{"determinism":1}}'
    assert fresh_main._parse_json(raw) is None


def test_parse_json_malformed(fresh_main):
    assert fresh_main._parse_json("not json at all") is None


def test_render_workflow_verdict(fresh_main):
    evaluation = {
        "verdict": "WORKFLOW",
        "scores": {"determinism": 2, "tool_variability": 1, "reasoning_depth": 1},
        "total": 4,
        "reasoning": "fixed order",
        "build_advice": "just write a script",
    }
    out = fresh_main.render(evaluation, "classify emails into 4 buckets")
    assert "🔁" in out
    assert "WORKFLOW" in out
    assert "fixed order" in out


def test_render_agent_verdict(fresh_main):
    evaluation = {
        "verdict": "AGENT",
        "scores": {"determinism": 4, "tool_variability": 5, "reasoning_depth": 5},
        "total": 14,
        "reasoning": "varies per call",
        "build_advice": "use an agent",
    }
    out = fresh_main.render(evaluation, "do anything the user asks")
    assert "🧠" in out
    assert "AGENT" in out


def test_render_error_path(fresh_main):
    out = fresh_main.render({"error": "boom"}, "x")
    assert "Couldn't evaluate" in out
    assert "boom" in out
