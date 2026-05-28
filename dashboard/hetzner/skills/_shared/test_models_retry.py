"""Tests for the _with_retry helper in models.py. No network."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
import requests

import models


def make_http_error(status_code: int) -> requests.HTTPError:
    response = MagicMock()
    response.status_code = status_code
    err = requests.HTTPError(f"HTTP {status_code}", response=response)
    return err


def test_succeeds_first_try():
    call = MagicMock(return_value={"ok": True})
    result = models._with_retry("test", call, sleeper=lambda _: None)
    assert result == {"ok": True}
    assert call.call_count == 1


def test_retries_on_transient_500_then_succeeds():
    call = MagicMock(side_effect=[make_http_error(500), {"ok": True}])
    result = models._with_retry("test", call, sleeper=lambda _: None)
    assert result == {"ok": True}
    assert call.call_count == 2


def test_retries_on_429_rate_limit():
    call = MagicMock(side_effect=[make_http_error(429), make_http_error(429), {"ok": True}])
    result = models._with_retry("test", call, sleeper=lambda _: None)
    assert result == {"ok": True}
    assert call.call_count == 3


def test_does_not_retry_on_permanent_400():
    call = MagicMock(side_effect=make_http_error(400))
    with pytest.raises(models.WorkerError) as exc_info:
        models._with_retry("test", call, sleeper=lambda _: None)
    assert "permanent" in str(exc_info.value)
    assert call.call_count == 1


def test_does_not_retry_on_permanent_401():
    call = MagicMock(side_effect=make_http_error(401))
    with pytest.raises(models.WorkerError):
        models._with_retry("test", call, sleeper=lambda _: None)
    assert call.call_count == 1


def test_retries_on_connection_error():
    call = MagicMock(side_effect=[requests.ConnectionError("boom"), {"ok": True}])
    result = models._with_retry("test", call, sleeper=lambda _: None)
    assert result == {"ok": True}
    assert call.call_count == 2


def test_exhausts_attempts_then_raises():
    call = MagicMock(side_effect=requests.ConnectionError("always broken"))
    with pytest.raises(models.WorkerError) as exc_info:
        models._with_retry("test", call, attempts=3, sleeper=lambda _: None)
    assert "exhausted 3 attempts" in str(exc_info.value)
    assert call.call_count == 3


def test_uses_injected_sleeper_between_attempts():
    sleeps: list[float] = []
    call = MagicMock(side_effect=[make_http_error(503), make_http_error(503), {"ok": True}])
    models._with_retry(
        "test",
        call,
        base_delay=0.5,
        max_delay=10,
        sleeper=lambda s: sleeps.append(s),
    )
    # Two sleeps between three attempts. Each respects base/backoff.
    assert len(sleeps) == 2
    assert sleeps[0] == 0.5
    assert sleeps[1] > sleeps[0]  # backoff applied


def test_504_gateway_timeout_is_transient():
    call = MagicMock(side_effect=[make_http_error(504), {"ok": True}])
    result = models._with_retry("test", call, sleeper=lambda _: None)
    assert result == {"ok": True}
