"""Tests for memory tier helpers. No network."""

import time

import pytest


@pytest.fixture
def isolated(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_MEMORY_DIR", str(tmp_path))
    import importlib
    import memory
    importlib.reload(memory)
    yield memory


def test_working_memory_starts_empty(isolated):
    mem = isolated
    w = mem.WorkingMemory.empty()
    assert w.all() == {}


def test_working_memory_get_set(isolated):
    mem = isolated
    w = mem.WorkingMemory.empty()
    w.set("ticker", "SPY")
    assert w.get("ticker") == "SPY"
    assert w.get("missing", "default") == "default"


def test_short_term_load_empty_when_no_file(isolated):
    mem = isolated
    assert mem.short_term_load(42) == {}


def test_short_term_save_then_load(isolated):
    mem = isolated
    mem.short_term_save(42, {"last_ticker": "GOOGL"})
    assert mem.short_term_load(42) == {"last_ticker": "GOOGL"}


def test_short_term_update_merges(isolated):
    mem = isolated
    mem.short_term_save(42, {"a": 1, "b": 2})
    result = mem.short_term_update(42, {"b": 99, "c": 3})
    assert result == {"a": 1, "b": 99, "c": 3}


def test_short_term_clear_removes_file(isolated):
    mem = isolated
    mem.short_term_save(42, {"x": 1})
    assert mem.short_term_clear(42) is True
    assert mem.short_term_load(42) == {}
    # Clearing again is a no-op
    assert mem.short_term_clear(42) is False


def test_short_term_expires_after_ttl(isolated, monkeypatch):
    mem = isolated
    mem.short_term_save(42, {"x": 1})
    # Fast-forward time past TTL
    real_time = time.time
    monkeypatch.setattr(
        time,
        "time",
        lambda: real_time() + mem.SHORT_TERM_TTL_SECONDS + 10,
    )
    assert mem.short_term_load(42) == {}


def test_short_term_corrupted_json_returns_empty(isolated):
    mem = isolated
    path = mem._short_term_path(42)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("not json {{{")
    assert mem.short_term_load(42) == {}


def test_long_term_pointer_normalizes(isolated):
    mem = isolated
    assert mem.long_term_pointer("trading") == "AIOS/Memory/trading.md"
    assert mem.long_term_pointer("Lucky Dog!") == "AIOS/Memory/luckydog.md"
    assert mem.long_term_pointer("") == "AIOS/Memory/general.md"


def test_separate_chat_ids_dont_collide(isolated):
    mem = isolated
    mem.short_term_save(1, {"who": "alice"})
    mem.short_term_save(2, {"who": "bob"})
    assert mem.short_term_load(1) == {"who": "alice"}
    assert mem.short_term_load(2) == {"who": "bob"}
