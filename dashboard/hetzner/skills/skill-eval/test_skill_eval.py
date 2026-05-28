"""Unit tests for /skill-eval. No network. No subprocess calls."""

import pytest


@pytest.fixture
def fresh_main(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path / "hermes"))
    import importlib
    import main
    importlib.reload(main)
    monkeypatch.setattr(main, "vault", None)
    yield main, tmp_path / "hermes" / "skills"


def test_no_skills_dir(fresh_main):
    main, _ = fresh_main
    found = main.find_skills_with_tests()
    assert found == []


def test_finds_skills_with_test_files(fresh_main):
    main, skills_dir = fresh_main
    a = skills_dir / "alpha"
    b = skills_dir / "beta"
    a.mkdir(parents=True)
    b.mkdir(parents=True)
    (a / "test_alpha.py").write_text("def test_x(): pass")
    (b / "main.py").write_text("# no tests here")
    found = main.find_skills_with_tests()
    assert len(found) == 1
    assert found[0].name == "alpha"


def test_parse_pytest_counts(fresh_main):
    main, _ = fresh_main
    text = "===== 5 passed, 2 failed, 1 error in 0.4s ====="
    p, f, e = main._parse_pytest_counts(text)
    assert p == 5
    assert f == 2
    assert e == 1


def test_parse_pytest_counts_zero_when_missing(fresh_main):
    main, _ = fresh_main
    p, f, e = main._parse_pytest_counts("nothing here")
    assert p == 0 and f == 0 and e == 0


def test_extract_summary_line(fresh_main):
    main, _ = fresh_main
    text = "garbage\n\n===== 3 passed in 0.4s ====="
    out = main._extract_summary_line(text)
    assert "3 passed" in out


def test_render_telegram_summary_all_pass(fresh_main):
    main, _ = fresh_main
    results = [
        {"skill": "a", "status": "pass", "passed": 3, "failed": 0, "errors": 0, "summary": "3 passed"},
        {"skill": "b", "status": "pass", "passed": 5, "failed": 0, "errors": 0, "summary": "5 passed"},
    ]
    out = main.render_telegram_summary(results)
    assert "✅" in out
    assert "Pass: 8" in out


def test_render_telegram_summary_with_failures(fresh_main):
    main, _ = fresh_main
    results = [
        {"skill": "a", "status": "pass", "passed": 3, "failed": 0, "errors": 0, "summary": "3 passed"},
        {"skill": "b", "status": "fail", "passed": 1, "failed": 2, "errors": 0, "summary": "2 failed"},
    ]
    out = main.render_telegram_summary(results)
    assert "⚠️" in out
    assert "Failing:" in out
    assert "`b`" in out


def test_render_report_includes_all_sections(fresh_main):
    main, _ = fresh_main
    results = [
        {"skill": "a", "status": "pass", "passed": 3, "failed": 0, "errors": 0, "summary": "ok"},
    ]
    report = main.render_report(results)
    assert "Skill Eval" in report
    assert "Per-skill results" in report
    assert "Next steps" in report


def test_render_report_flags_failures(fresh_main):
    main, _ = fresh_main
    results = [
        {"skill": "x", "status": "fail", "passed": 0, "failed": 1, "errors": 0,
         "summary": "AssertionError: boom"},
    ]
    report = main.render_report(results)
    assert "Failing detail" in report
    assert "boom" in report
