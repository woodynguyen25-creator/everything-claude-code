"""Unit tests for md-ingest. No network."""

import pytest


@pytest.fixture
def fresh_main():
    import importlib
    import main
    importlib.reload(main)
    yield main


def test_slugify_normal(fresh_main):
    main = fresh_main
    assert main.slugify("Some Title Here") == "some-title-here"


def test_slugify_strips_special_chars(fresh_main):
    main = fresh_main
    assert main.slugify("Foo/Bar?Baz!") == "foo-bar-baz"


def test_slugify_handles_empty(fresh_main):
    main = fresh_main
    assert main.slugify("") == "untitled"
    assert main.slugify("   ") == "untitled"


def test_slugify_truncates_long_input(fresh_main):
    main = fresh_main
    out = main.slugify("a" * 200)
    assert len(out) <= 80


def test_crude_html_to_text_strips_tags(fresh_main):
    main = fresh_main
    html = "<html><body><h1>Title</h1><p>Body text</p></body></html>"
    text = main.crude_html_to_text(html)
    assert "Title" in text
    assert "Body text" in text
    assert "<h1>" not in text
    assert "<p>" not in text


def test_crude_html_to_text_strips_scripts(fresh_main):
    main = fresh_main
    html = '<html><script>alert("xss")</script><body>Real content</body></html>'
    text = main.crude_html_to_text(html)
    assert "Real content" in text
    assert "alert" not in text
    assert "xss" not in text


def test_crude_html_to_text_strips_styles(fresh_main):
    main = fresh_main
    html = "<html><style>body { color: red; }</style><body>Content</body></html>"
    text = main.crude_html_to_text(html)
    assert "Content" in text
    assert "color: red" not in text


def test_crude_html_collapses_excess_newlines(fresh_main):
    main = fresh_main
    html = "<p>A</p>\n\n\n\n\n<p>B</p>"
    text = main.crude_html_to_text(html)
    assert "\n\n\n" not in text  # max 2 consecutive newlines


def test_run_rejects_empty_arg(fresh_main):
    main = fresh_main
    out = main.run({"text": ""})
    assert "Usage" in out["reply"]
