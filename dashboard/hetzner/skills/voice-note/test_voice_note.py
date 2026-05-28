"""Unit tests for the voice-note skill.

Run with: python -m pytest test_voice_note.py -v
"""

from __future__ import annotations

from main import build_note, pick_folder


def test_pick_folder_trading():
    assert pick_folder("watching SPY puts tomorrow #trading") == "Trading Assistant/Voice Notes"


def test_pick_folder_luckydog():
    assert pick_folder("idea for the lucky dog hero animation #luckydog") == "Lucky Dog Landing Page/Voice Notes"


def test_pick_folder_parlay():
    assert pick_folder("nfl slate #parlay") == "ParlayBot/Voice Notes"


def test_pick_folder_solo():
    assert pick_folder("new poster concept #solo") == "Solo Store/Voice Notes"


def test_pick_folder_homework():
    assert pick_folder("econ essay outline #homework") == "Homework/Voice Notes"


def test_pick_folder_idea():
    assert pick_folder("random idea about cars #idea") == "_inbox"


def test_pick_folder_default_no_tag():
    assert pick_folder("just thinking out loud") == "_inbox"


def test_pick_folder_case_insensitive():
    assert pick_folder("SOMETHING ABOUT TRADING #TRADING") == "Trading Assistant/Voice Notes"


def test_build_note_includes_transcript():
    note = build_note("hello world", "2026-05-26T10:30:00", "2026-05-26-1030")
    assert "hello world" in note
    assert "Voice 2026-05-26-1030" in note
    assert "telegram-voice" in note
    assert note.startswith("---")
    assert note.rstrip().endswith("hello world")


def test_build_note_frontmatter_keys():
    note = build_note("test", "2026-05-26T10:30:00", "2026-05-26-1030")
    assert "tags: [voice, inbox, telegram]" in note
    assert "source: telegram-voice" in note
    assert "created: 2026-05-26T10:30:00" in note
