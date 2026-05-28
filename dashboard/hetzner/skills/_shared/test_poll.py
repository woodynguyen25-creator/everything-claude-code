"""Unit tests for the generic poll helper. No network."""

from typing import Any, Dict, List

import pytest

import poll as pollmod


def test_poll_succeeds_first_try():
    def check() -> Dict[str, Any]:
        return {"status": "complete", "data": 1}

    result = pollmod.poll(check, sleeper=lambda _: None)
    assert result["data"] == 1


def test_poll_succeeds_after_pending():
    states: List[str] = ["pending", "running", "complete"]

    def check() -> Dict[str, Any]:
        return {"status": states.pop(0)}

    result = pollmod.poll(
        check,
        config=pollmod.PollConfig(max_retries=5, sleep_seconds=0),
        sleeper=lambda _: None,
    )
    assert result["status"] == "complete"


def test_poll_raises_failure_on_fail_state():
    def check() -> Dict[str, Any]:
        return {"status": "failed"}

    with pytest.raises(pollmod.PollFailure):
        pollmod.poll(check, sleeper=lambda _: None)


def test_poll_timeout_when_never_terminal():
    def check() -> Dict[str, Any]:
        return {"status": "pending"}

    with pytest.raises(pollmod.PollTimeout):
        pollmod.poll(
            check,
            config=pollmod.PollConfig(max_retries=3, sleep_seconds=0),
            sleeper=lambda _: None,
        )


def test_poll_calls_on_tick_each_iter():
    states = ["a", "b", "complete"]
    ticks: List[int] = []

    def check() -> Dict[str, Any]:
        return {"status": states.pop(0)}

    def tick(i: int, _payload: Dict[str, Any]) -> None:
        ticks.append(i)

    pollmod.poll(check, config=pollmod.PollConfig(max_retries=5, sleep_seconds=0), on_tick=tick, sleeper=lambda _: None)
    assert ticks == [0, 1, 2]


def test_poll_until_predicate_satisfied():
    count = {"n": 0}

    def check() -> int:
        count["n"] += 1
        return count["n"]

    result = pollmod.poll_until(
        check,
        predicate=lambda x: x >= 3,
        config=pollmod.PollConfig(max_retries=10, sleep_seconds=0),
        sleeper=lambda _: None,
    )
    assert result == 3


def test_poll_until_timeout():
    def check() -> int:
        return 0

    with pytest.raises(pollmod.PollTimeout):
        pollmod.poll_until(
            check,
            predicate=lambda _: False,
            config=pollmod.PollConfig(max_retries=2, sleep_seconds=0),
            sleeper=lambda _: None,
        )


def test_custom_state_key():
    def check() -> Dict[str, Any]:
        return {"state": "ready"}

    result = pollmod.poll(
        check,
        config=pollmod.PollConfig(state_key="state"),
        sleeper=lambda _: None,
    )
    assert result["state"] == "ready"


def test_custom_success_states():
    def check() -> Dict[str, Any]:
        return {"status": "DONE"}

    result = pollmod.poll(
        check,
        config=pollmod.PollConfig(success_states=("DONE",)),
        sleeper=lambda _: None,
    )
    assert result["status"] == "DONE"
