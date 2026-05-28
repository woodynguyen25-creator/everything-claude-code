"""Unit tests for codify-workflow. No network."""

import textwrap
from typing import Dict, List

import pytest


@pytest.fixture
def fresh_main():
    import importlib
    import main
    importlib.reload(main)
    yield main


def test_parse_activity_log_skips_header(fresh_main):
    main = fresh_main
    log = textwrap.dedent("""\
        | Column1 | Column2 |
        |---|---|
        | 2026-05-26T10:00:00 | voice-note | ✅ | saved | | | route=trading |
    """)
    rows = main.parse_activity_log(log)
    assert len(rows) == 1
    assert rows[0]["task"] == "voice-note"


def test_parse_activity_log_rejects_non_iso_timestamps(fresh_main):
    main = fresh_main
    log = "| not-a-date | task | ✅ | summary | | | notes |"
    rows = main.parse_activity_log(log)
    assert rows == []


def test_within_last_n_days_filters(fresh_main):
    main = fresh_main
    import datetime as dt
    today = dt.datetime.now().isoformat(timespec="seconds")
    week_ago = (dt.datetime.now() - dt.timedelta(days=8)).isoformat(timespec="seconds")
    rows = [
        {"timestamp": today, "task": "fresh", "outcome": "✅", "summary": "", "notes": ""},
        {"timestamp": week_ago, "task": "old", "outcome": "✅", "summary": "", "notes": ""},
    ]
    filtered = main.within_last_n_days(rows, 7)
    assert len(filtered) == 1
    assert filtered[0]["task"] == "fresh"


def test_task_frequency_threshold(fresh_main):
    main = fresh_main
    rows: List[Dict[str, str]] = []
    for _ in range(4):
        rows.append({"timestamp": "x", "task": "common", "outcome": "✅", "summary": "", "notes": ""})
    rows.append({"timestamp": "x", "task": "rare", "outcome": "✅", "summary": "", "notes": ""})
    freq = main.task_frequency(rows)
    # rare only appears once — below MIN_PATTERN_FREQ (3)
    assert any("common" in f for f in freq)
    assert not any("rare" in f for f in freq)


def test_failure_clusters_groups_by_task(fresh_main):
    main = fresh_main
    rows = [
        {"timestamp": "x", "task": "morning-brief", "outcome": "❌", "summary": "", "notes": "API rate limit"},
        {"timestamp": "x", "task": "morning-brief", "outcome": "❌", "summary": "", "notes": "API rate limit"},
        {"timestamp": "x", "task": "voice-note", "outcome": "✅", "summary": "", "notes": ""},
    ]
    clusters = main.failure_clusters(rows)
    assert any("morning-brief" in c for c in clusters)
    assert any("API rate limit" in c for c in clusters)
    assert not any("voice-note" in c for c in clusters)


def test_failure_clusters_skip_single_failures(fresh_main):
    main = fresh_main
    rows = [
        {"timestamp": "x", "task": "one-off", "outcome": "❌", "summary": "", "notes": "one fail"},
    ]
    # Only fires for tasks with 2+ failures
    clusters = main.failure_clusters(rows)
    assert clusters == []


def test_voice_note_themes_counts_folders(fresh_main):
    main = fresh_main
    entries = [
        {"relativePath": "Trading Assistant\\Voice Notes\\voice-1.md"},
        {"relativePath": "Trading Assistant\\Voice Notes\\voice-2.md"},
        {"relativePath": "Lucky Dog Landing Page\\Voice Notes\\voice-3.md"},
    ]
    themes = main.voice_note_themes(entries)
    # Top folder = Trading Assistant (2 hits)
    assert any("Trading Assistant" in t for t in themes)


def test_build_signals_empty_when_no_data(fresh_main):
    main = fresh_main
    signals = main.build_signals([], [], [])
    assert "no notable signals" in signals
