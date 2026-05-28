"""Unit tests for /forge orchestrator. No network."""

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


def test_preflight_handles_no_triad(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "triad", None)
    out = fresh_main.preflight()
    assert out["triad_ok"] is False
    assert any("triad-router" in issue for issue in out["issues"])


def test_render_summary_no_results(fresh_main):
    preflight = {"bridge_ok": True, "triad_ok": True, "deepseek_status": "ok", "issues": []}
    pipeline = {"execution_plan": {"mode": "triad", "questions": []}, "results": []}
    summary = fresh_main.render_summary(preflight, pipeline)
    assert "Pieces executed:* 0" in summary


def test_render_summary_with_pieces(fresh_main):
    preflight = {"bridge_ok": True, "triad_ok": True, "deepseek_status": "ok", "issues": []}
    pipeline = {
        "execution_plan": {"mode": "quad", "questions": ["q1"]},
        "results": [
            {"piece": "Initial scan", "model": "cerebras", "status": "ok",
             "tokens_in": 100, "tokens_out": 200, "cost_usd": 0.0},
            {"piece": "Synthesis", "model": "claude-max", "status": "ok",
             "tokens_in": 50, "tokens_out": 150, "cost_usd": 0.0},
        ],
        "total_cost_usd": 0.0,
    }
    summary = fresh_main.render_summary(preflight, pipeline)
    assert "✅" in summary
    assert "cerebras" in summary
    assert "claude-max" in summary
    assert "quad" in summary


def test_render_summary_shows_errors(fresh_main):
    preflight = {"bridge_ok": False, "triad_ok": True, "deepseek_status": "ok",
                 "issues": ["PC bridge unreachable"]}
    pipeline = {"execution_plan": {"mode": "triad", "questions": []},
                "results": [{"piece": "p", "model": "codex", "status": "queued_for_pc"}]}
    summary = fresh_main.render_summary(preflight, pipeline)
    assert "PC bridge unreachable" in summary
    assert "⚠️" in summary


def test_render_summary_error_short_circuits(fresh_main):
    preflight = {"bridge_ok": True, "triad_ok": False, "deepseek_status": "?", "issues": []}
    pipeline = {"error": "triad-router not available"}
    summary = fresh_main.render_summary(preflight, pipeline)
    assert "❌" in summary
    assert "not available" in summary


def test_execute_pipeline_no_triad(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "triad", None)
    out = fresh_main.execute_pipeline("build me a thing")
    assert "error" in out
