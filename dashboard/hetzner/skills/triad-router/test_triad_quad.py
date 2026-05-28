"""Tests for the v0.2 quad-mode critique loop. No network.

Uses monkeypatched workers + vault helpers so we can simulate model responses.
"""

from __future__ import annotations

import importlib
from typing import Any, Dict, List

import pytest


@pytest.fixture
def isolated(monkeypatch, tmp_path):
    state_path = tmp_path / "spend.json"
    monkeypatch.setenv("TRIAD_SPEND_STATE", str(state_path))
    import main
    importlib.reload(main)
    yield main


class FakeWorkers:
    """Drop-in replacement for the real workers module. Returns canned responses."""

    class WorkerError(RuntimeError):
        pass

    def __init__(self, responses: List[Dict[str, Any]]):
        self._responses = list(responses)
        self.calls: List[Dict[str, Any]] = []

    def dispatch(self, model: str, prompt: str, **kwargs) -> Dict[str, Any]:
        self.calls.append({"model": model, "prompt": prompt})
        if not self._responses:
            raise self.WorkerError(f"no canned response left for {model}")
        return self._responses.pop(0)

    def call_claude_max(self, prompt: str, **_kwargs) -> Dict[str, Any]:
        return self.dispatch("claude-max", prompt)

    def call_deepseek(self, prompt: str, **_kwargs) -> Dict[str, Any]:
        return self.dispatch("deepseek", prompt)

    def call_cerebras(self, prompt: str, **_kwargs) -> Dict[str, Any]:
        return self.dispatch("cerebras", prompt)

    def call_groq(self, prompt: str, **_kwargs) -> Dict[str, Any]:
        return self.dispatch("groq", prompt)

    def call_gemini_flash(self, prompt: str, **_kwargs) -> Dict[str, Any]:
        return self.dispatch("gemini-flash", prompt)

    def call_codex(self, prompt: str, **_kwargs) -> Dict[str, Any]:
        return self.dispatch("codex", prompt)


def _canned(model: str, text: str, tokens_in: int = 50, tokens_out: int = 50, cost: float = 0.0):
    return {
        "text": text,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost_usd": cost,
        "model": model,
    }


def test_triad_mode_no_critique_loops(isolated, monkeypatch):
    main = isolated
    # The simplest plan: just synthesis. Provide one canned response.
    fake = FakeWorkers([_canned("claude-max", "initial synthesis result")])
    monkeypatch.setattr(main, "workers", fake)

    plan = main.Plan(
        forging="simple task",
        pieces=[
            main.Piece("Run Interrogator + finalize scope", capability="interrogate"),
            main.Piece("Synthesize results + write Telegram reply", capability="synthesis"),
        ],
        mode="triad",
    )
    results = main.execute_plan(plan)
    # Only one piece executed (interrogator skipped). No critique loop in triad mode.
    assert len(results) == 1
    assert results[0].model == "claude-max"
    assert "synthesis result" in results[0].text


def test_quad_mode_runs_critique_then_resynth(isolated, monkeypatch):
    main = isolated
    fake = FakeWorkers([
        _canned("claude-max", "initial synthesis v1"),    # synthesis pass
        _canned("gemini-flash", "critique 1: missed X"),   # loop 1 critique
        _canned("claude-max", "synthesis v2 addresses X"), # loop 1 re-synth
        _canned("cerebras", "already strong"),             # loop 2 critique — early exit
    ])
    monkeypatch.setattr(main, "workers", fake)

    plan = main.Plan(
        forging="critique heavily",
        pieces=[
            main.Piece("Run Interrogator + finalize scope", capability="interrogate"),
            main.Piece("Synthesize results + write Telegram reply", capability="synthesis"),
        ],
        mode="quad",
    )
    results = main.execute_plan(plan)
    # Expect: synthesis (1) + loop1 critique + loop1 re-synth + loop2 critique (early-exits)
    assert len(results) == 4
    models = [r.model for r in results]
    assert models[0] == "claude-max"        # initial synthesis
    assert models[1] == "gemini-flash"      # loop 1 critique
    assert models[2] == "claude-max"        # loop 1 re-synth
    assert models[3] == "cerebras"          # loop 2 critique (early exit)


def test_quad_mode_hard_cap_at_3_loops(isolated, monkeypatch):
    main = isolated
    # Never say "already strong" — force all 3 loops to run.
    responses = [
        _canned("claude-max", "synthesis v1"),
        _canned("gemini-flash", "critique 1 — needs work"),
        _canned("claude-max", "synthesis v2"),
        _canned("cerebras", "critique 2 — still needs work"),
        _canned("claude-max", "synthesis v3"),
        _canned("groq", "critique 3 — okay-ish"),
        _canned("claude-max", "synthesis v4"),
    ]
    fake = FakeWorkers(responses)
    monkeypatch.setattr(main, "workers", fake)

    plan = main.Plan(
        forging="ultrathink this",
        pieces=[
            main.Piece("Run Interrogator + finalize scope", capability="interrogate"),
            main.Piece("Synthesize results + write Telegram reply", capability="synthesis"),
        ],
        mode="quad",
    )
    results = main.execute_plan(plan)
    # 1 initial synthesis + 3 loops × (critique + resynth) = 7 total
    assert len(results) == 7


def test_codex_routing_when_bridge_down(isolated, monkeypatch):
    main = isolated

    class FailingCodex(FakeWorkers):
        def dispatch(self, model, prompt, **kwargs):
            self.calls.append({"model": model, "prompt": prompt})
            if model == "codex":
                raise self.WorkerError("codex via bridge failed (PC off?): timeout")
            return super().dispatch(model, prompt, **kwargs)

    fake = FailingCodex([_canned("claude-max", "synth ok")])
    monkeypatch.setattr(main, "workers", fake)

    plan = main.Plan(
        forging="build a thing",
        pieces=[
            main.Piece("Run Interrogator + finalize scope", capability="interrogate"),
            main.Piece("Implement the change", capability="code"),
            main.Piece("Synthesize results + write Telegram reply", capability="synthesis"),
        ],
        mode="triad",
    )
    results = main.execute_plan(plan)
    code_result = next(r for r in results if r.model == "codex")
    assert code_result.status == "queued_for_pc"
    assert "QUEUED FOR PC" in code_result.text


def test_quad_mode_with_no_synthesis_piece_skips_loop(isolated, monkeypatch):
    main = isolated
    fake = FakeWorkers([])
    monkeypatch.setattr(main, "workers", fake)

    plan = main.Plan(
        forging="research only",
        pieces=[
            main.Piece("Run Interrogator + finalize scope", capability="interrogate"),
        ],
        mode="quad",
    )
    results = main.execute_plan(plan)
    # No synthesis piece, so quad loop skipped entirely
    assert results == []
