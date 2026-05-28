"""Unit tests for triad-router skill. Hits no network / no LLMs."""

from __future__ import annotations

import json
import os
import tempfile
import unittest.mock as mock
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def isolated_spend_state(monkeypatch, tmp_path):
    """Isolate spend state to a tmp file per test."""
    state_path = tmp_path / "spend.json"
    monkeypatch.setenv("TRIAD_SPEND_STATE", str(state_path))
    # Reload module so the constant picks up the new env
    import importlib
    import main
    importlib.reload(main)
    yield main


def test_initial_spend_is_zero(isolated_spend_state):
    main = isolated_spend_state
    assert main.load_daily_spend() == {}
    assert main.deepseek_status() == "ok"


def test_spend_accrues(isolated_spend_state):
    main = isolated_spend_state
    main.add_spend("deepseek", 0.10)
    main.add_spend("deepseek", 0.15)
    assert main.load_daily_spend()["deepseek"] == pytest.approx(0.25)
    assert main.deepseek_status() == "ok"


def test_soft_warn_threshold(isolated_spend_state):
    main = isolated_spend_state
    main.add_spend("deepseek", 0.55)
    assert main.deepseek_status() == "soft_warn"


def test_hard_stop_threshold(isolated_spend_state):
    main = isolated_spend_state
    main.add_spend("deepseek", 1.60)
    assert main.deepseek_status() == "hard_stop"


def test_routing_default_deepseek_when_ok(isolated_spend_state):
    main = isolated_spend_state
    piece = main.Piece(description="bulk gen", capability="bulk")
    assert piece.assigned_model() == "deepseek"


def test_routing_reroutes_to_codex_when_hard_stop(isolated_spend_state):
    main = isolated_spend_state
    main.add_spend("deepseek", 2.00)
    piece = main.Piece(description="bulk gen", capability="bulk")
    assert piece.assigned_model() == "codex"


def test_routing_other_capabilities_unaffected(isolated_spend_state):
    main = isolated_spend_state
    main.add_spend("deepseek", 2.00)  # cap hit
    assert main.Piece("synth", "synthesis").assigned_model() == "claude-max"
    assert main.Piece("scan", "scan").assigned_model() == "cerebras"
    assert main.Piece("code", "code").assigned_model() == "codex"


def test_interrogate_returns_questions(isolated_spend_state):
    main = isolated_spend_state
    questions = main.interrogate("build a thing")
    assert len(questions) >= 1
    assert all(isinstance(q, str) and q.endswith("?") or q.endswith(")") for q in questions)


def test_decompose_always_has_interrogate_and_synthesis(isolated_spend_state):
    main = isolated_spend_state
    pieces = main.decompose("build me a thing")
    capabilities = [p.capability for p in pieces]
    assert capabilities[0] == "interrogate"
    assert capabilities[-1] == "synthesis"


def test_decompose_picks_code_for_implement(isolated_spend_state):
    main = isolated_spend_state
    pieces = main.decompose("refactor the dashboard")
    assert any(p.capability == "code" for p in pieces)


def test_decompose_picks_bulk_for_generate(isolated_spend_state):
    main = isolated_spend_state
    pieces = main.decompose("generate 50 marketing variants")
    assert any(p.capability == "bulk" for p in pieces)


def test_detect_mode_triad_default(isolated_spend_state):
    main = isolated_spend_state
    assert main.detect_mode("just build it") == "triad"


def test_detect_mode_quad_on_ultrathink(isolated_spend_state):
    main = isolated_spend_state
    assert main.detect_mode("ultrathink this problem") == "quad"
    assert main.detect_mode("deep dive into the architecture") == "quad"


def test_route_returns_plan(isolated_spend_state):
    main = isolated_spend_state
    out = main.route({"text": "build me a thing"})
    assert "reply" in out
    assert "Execution plan" in out["reply"]
    assert out["next_action"] == "answer_questions"


def test_route_empty_request(isolated_spend_state):
    main = isolated_spend_state
    out = main.route({"text": ""})
    assert "empty request" in out["reply"].lower()
