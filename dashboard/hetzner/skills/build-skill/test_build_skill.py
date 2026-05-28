"""Unit tests for /build-skill. No network."""

import pytest


@pytest.fixture
def fresh_main(monkeypatch):
    import importlib
    import main
    importlib.reload(main)
    yield main


def test_parse_args_normal(fresh_main):
    name, desc = fresh_main.parse_args("weather-brief: pulls Houston weather")
    assert name == "weather-brief"
    assert desc == "pulls Houston weather"


def test_parse_args_strips_special_chars(fresh_main):
    name, _ = fresh_main.parse_args("Weather!Brief: stuff")
    assert name == "weatherbrief"


def test_parse_args_handles_missing_colon(fresh_main):
    name, desc = fresh_main.parse_args("just a description without colon")
    assert name == ""
    assert desc.startswith("just a description")


def test_parse_response_extracts_both_blocks(fresh_main):
    text = """Some preamble.

```yaml
name: test
version: 0.1.0
```

```python
def run(event):
    return {"reply": "hi"}
```

Closing remarks."""
    yaml_out, py_out, err = fresh_main.parse_response(text)
    assert err == ""
    assert "name: test" in yaml_out
    assert "def run(event)" in py_out


def test_parse_response_returns_error_if_yaml_missing(fresh_main):
    text = "```python\ndef foo(): pass\n```"
    _, _, err = fresh_main.parse_response(text)
    assert err != ""
    assert "missing" in err.lower()


def test_parse_response_returns_error_if_python_missing(fresh_main):
    text = "```yaml\nname: x\n```"
    _, _, err = fresh_main.parse_response(text)
    assert err != ""


def test_render_readme_includes_name(fresh_main):
    readme = fresh_main.render_readme("my-skill", "does the thing")
    assert "my-skill" in readme
    assert "does the thing" in readme
    assert "Deploy" in readme


def test_run_empty_input_returns_usage(fresh_main):
    out = fresh_main.run({"text": ""})
    assert "Usage:" in out["reply"]


def test_run_no_colon_returns_usage(fresh_main):
    out = fresh_main.run({"text": "no colon here"})
    assert "Usage:" in out["reply"]
