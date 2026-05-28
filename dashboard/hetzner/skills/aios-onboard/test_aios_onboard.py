"""Unit tests for aios-onboard. No network. Uses tmp state dir."""

import os
from pathlib import Path

import pytest


@pytest.fixture
def isolated(monkeypatch, tmp_path):
    monkeypatch.setenv("ONBOARD_STATE_DIR", str(tmp_path))
    import importlib
    import main
    importlib.reload(main)
    yield main


def test_questions_present(isolated):
    main = isolated
    assert len(main.QUESTIONS) == 7
    assert all("prompt" in q and "key" in q for q in main.QUESTIONS)


def test_start_creates_state(isolated):
    main = isolated
    result = main.start({"chat_id": 42, "text": ""})
    assert "1/7" in result["reply"]
    assert result["intake_step"] == 1
    state = main.load_state(42)
    assert state is not None
    assert state["step"] == 0


def test_receive_answer_advances_step(isolated):
    main = isolated
    main.start({"chat_id": 42, "text": ""})
    main.receive_answer({"chat_id": 42, "text": "I'm Woody, a UH finance student."})
    state = main.load_state(42)
    assert state["step"] == 1
    assert state["answers"]["identity"].startswith("I'm Woody")


def test_complete_intake_synthesizes(isolated):
    main = isolated
    main.start({"chat_id": 99, "text": ""})
    for i in range(7):
        main.receive_answer({"chat_id": 99, "text": f"answer {i}"})
    # State should be cleared after finalize
    assert main.load_state(99) is None


def test_reset_clears_state(isolated):
    main = isolated
    main.start({"chat_id": 7, "text": ""})
    main.receive_answer({"chat_id": 7, "text": "anything"})
    main.start({"chat_id": 7, "text": "reset"})
    state = main.load_state(7)
    assert state["step"] == 0
    assert state["answers"] == {}


def test_synthesize_includes_all_answers(isolated):
    main = isolated
    answers = {q["key"]: f"answer for {q['key']}" for q in main.QUESTIONS}
    intake = main.synthesize_intake(answers)
    for q in main.QUESTIONS:
        assert f"answer for {q['key']}" in intake


def test_synthesize_handles_missing_answers(isolated):
    main = isolated
    intake = main.synthesize_intake({"identity": "x"})
    assert "x" in intake
    assert "_not answered_" in intake


def test_next_quarter_is_90_days_out(isolated):
    main = isolated
    nq = main._next_quarter("2026-01-01")
    assert nq == "2026-04-01"
