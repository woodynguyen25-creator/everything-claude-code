"""Generic polling helper. Per AI Masterclass synthesis adoption #4.4.

The polling pattern appears in 3+ video workflows (Sora 2, Kie.ai, n8n long
jobs). Each had its own hand-rolled retry/backoff. This is a single tested
implementation usable by any skill.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional, Tuple


class PollTimeout(RuntimeError):
    """Raised when max_retries is exceeded without reaching a terminal state."""


class PollFailure(RuntimeError):
    """Raised when the polled endpoint returns a known fail_state."""


@dataclass(frozen=True)
class PollConfig:
    max_retries: int = 20
    sleep_seconds: float = 10.0
    backoff_multiplier: float = 1.0  # 1.0 = constant sleep
    max_sleep_seconds: float = 60.0
    success_states: Tuple[str, ...] = ("complete", "succeeded", "ready")
    fail_states: Tuple[str, ...] = ("failed", "cancelled", "error")
    state_key: str = "status"


def poll(
    check_fn: Callable[[], Dict[str, Any]],
    config: Optional[PollConfig] = None,
    on_tick: Optional[Callable[[int, Dict[str, Any]], None]] = None,
    sleeper: Callable[[float], None] = time.sleep,
) -> Dict[str, Any]:
    """Poll ``check_fn`` until it returns a payload with a terminal state.

    Args:
        check_fn: Callable that does the HTTP GET (or whatever) and returns the
            parsed JSON dict. The poll function checks the value at
            ``payload[config.state_key]`` against success/fail tuples.
        config: PollConfig override; defaults are sane.
        on_tick: Optional callback fired each iteration. Useful for logging.
        sleeper: Override of ``time.sleep`` — injected for testability.

    Returns:
        The final payload once a success state is hit.

    Raises:
        PollTimeout: if max_retries exhausted without terminal state.
        PollFailure: if a known fail_state is observed.
    """
    cfg = config or PollConfig()
    sleep_for = cfg.sleep_seconds

    for attempt in range(cfg.max_retries):
        payload = check_fn()
        state = str(payload.get(cfg.state_key, "")).lower()

        if on_tick is not None:
            on_tick(attempt, payload)

        if state in tuple(s.lower() for s in cfg.success_states):
            return payload
        if state in tuple(s.lower() for s in cfg.fail_states):
            raise PollFailure(f"polled endpoint reached fail state '{state}'")

        sleeper(sleep_for)
        sleep_for = min(sleep_for * cfg.backoff_multiplier, cfg.max_sleep_seconds)

    raise PollTimeout(
        f"max_retries={cfg.max_retries} exhausted without reaching {cfg.success_states}"
    )


def poll_until(
    check_fn: Callable[[], Any],
    predicate: Callable[[Any], bool],
    config: Optional[PollConfig] = None,
    on_tick: Optional[Callable[[int, Any], None]] = None,
    sleeper: Callable[[float], None] = time.sleep,
) -> Any:
    """Lower-level variant: poll until ``predicate(payload)`` returns True.

    Useful when the API doesn't have a `status` field — e.g. waiting for a
    file to appear, a count to cross a threshold, etc.
    """
    cfg = config or PollConfig()
    sleep_for = cfg.sleep_seconds

    for attempt in range(cfg.max_retries):
        payload = check_fn()
        if on_tick is not None:
            on_tick(attempt, payload)
        if predicate(payload):
            return payload
        sleeper(sleep_for)
        sleep_for = min(sleep_for * cfg.backoff_multiplier, cfg.max_sleep_seconds)

    raise PollTimeout(f"max_retries={cfg.max_retries} exhausted")
