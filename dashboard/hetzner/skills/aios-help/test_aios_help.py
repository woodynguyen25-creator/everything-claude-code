"""Unit tests for aios-help skill. No network."""

import textwrap

import main


def test_parse_minimal_yaml_simple():
    text = textwrap.dedent("""\
        name: foo
        version: 0.1.0
        description: A simple skill
    """)
    parsed = main.parse_minimal_yaml(text)
    assert parsed["name"] == "foo"
    assert parsed["version"] == "0.1.0"
    assert parsed["description"] == "A simple skill"


def test_parse_minimal_yaml_block_description():
    text = textwrap.dedent("""\
        name: bar
        description: >
          A longer description that spans
          multiple lines.
        version: 0.2.0
    """)
    parsed = main.parse_minimal_yaml(text)
    assert parsed["name"] == "bar"
    assert "longer description" in parsed["description"]
    assert "multiple lines" in parsed["description"]
    assert parsed["version"] == "0.2.0"


def test_parse_minimal_yaml_nested_trigger():
    text = textwrap.dedent("""\
        name: baz
        trigger:
          type: explicit
          command: /baz
    """)
    parsed = main.parse_minimal_yaml(text)
    assert parsed["name"] == "baz"
    assert parsed["trigger"]["type"] == "explicit"
    assert parsed["trigger"]["command"] == "/baz"


def test_render_empty():
    out = main.render([])
    assert "No skills found" in out


def test_render_explicit_skill():
    skills = [{
        "name": "voice-note",
        "description": "Transcribe voice memos",
        "command": "/voice-note",
        "trigger_type": "explicit",
        "version": "0.1.0",
    }]
    out = main.render(skills)
    assert "/voice-note" in out
    assert "Transcribe voice memos" in out
    assert "Commands you can send" in out


def test_render_event_triggered_separately():
    skills = [{
        "name": "voice-note",
        "description": "Transcribe voice memos",
        "command": "",
        "trigger_type": "telegram_voice_message",
        "version": "0.1.0",
    }]
    out = main.render(skills)
    assert "Event-triggered" in out
    assert "telegram_voice_message" in out


def test_render_truncates_long_descriptions():
    long_desc = "x" * 200
    skills = [{
        "name": "long",
        "description": long_desc,
        "command": "/long",
        "trigger_type": "explicit",
        "version": "0.1.0",
    }]
    out = main.render(skills)
    assert "..." in out
    assert "x" * 200 not in out
