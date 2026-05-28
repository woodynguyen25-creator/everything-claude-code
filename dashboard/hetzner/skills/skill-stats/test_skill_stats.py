"""Unit tests for /skill-stats. No network."""

import pytest


@pytest.fixture
def fresh_main(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path / "hermes"))
    import importlib
    import main
    importlib.reload(main)
    monkeypatch.setattr(main, "vault", None)
    yield main, tmp_path / "hermes" / "skills"


def test_no_skills_dir_returns_empty(fresh_main):
    main, _ = fresh_main
    stats = main.gather_stats()
    assert stats["totals"]["count"] == 0
    assert stats["totals"]["loc"] == 0


def test_count_lines_handles_missing_file(fresh_main, tmp_path):
    main, _ = fresh_main
    assert main.count_lines(tmp_path / "nope.py") == 0


def test_count_lines_real_file(fresh_main, tmp_path):
    main, _ = fresh_main
    file = tmp_path / "x.py"
    file.write_text("a\nb\nc\n")
    assert main.count_lines(file) == 3


def test_gather_stats_simple_skill(fresh_main):
    main, skills_dir = fresh_main
    skill = skills_dir / "test-skill"
    skill.mkdir(parents=True)
    (skill / "skill.yaml").write_text("name: test-skill\n")
    (skill / "main.py").write_text("def x(): pass\ndef y(): pass\n")
    (skill / "test_main.py").write_text("def test_x(): pass\n")

    stats = main.gather_stats()
    assert stats["totals"]["count"] == 1
    assert stats["totals"]["loc"] == 2
    assert stats["totals"]["test_loc"] == 1
    assert stats["totals"]["tested"] == 1
    assert stats["totals"]["test_coverage_pct"] == 100


def test_gather_stats_skill_without_tests(fresh_main):
    main, skills_dir = fresh_main
    skill = skills_dir / "untested"
    skill.mkdir(parents=True)
    (skill / "skill.yaml").write_text("name: untested\n")
    (skill / "main.py").write_text("def x(): pass\n")

    stats = main.gather_stats()
    assert stats["totals"]["count"] == 1
    assert stats["totals"]["tested"] == 0
    assert stats["totals"]["test_coverage_pct"] == 0


def test_gather_stats_coverage_pct_with_mixed(fresh_main):
    main, skills_dir = fresh_main
    for name in ["a", "b", "c", "d"]:
        skill = skills_dir / name
        skill.mkdir(parents=True)
        (skill / "skill.yaml").write_text(f"name: {name}\n")
        (skill / "main.py").write_text("pass\n")
    # Only a and b have tests
    (skills_dir / "a" / "test_a.py").write_text("def t(): pass\n")
    (skills_dir / "b" / "test_b.py").write_text("def t(): pass\n")

    stats = main.gather_stats()
    assert stats["totals"]["count"] == 4
    assert stats["totals"]["tested"] == 2
    assert stats["totals"]["test_coverage_pct"] == 50


def test_gather_stats_excludes_dot_dirs(fresh_main):
    main, skills_dir = fresh_main
    hidden = skills_dir / ".git"
    hidden.mkdir(parents=True)
    (hidden / "skill.yaml").write_text("name: .git\n")
    stats = main.gather_stats()
    assert stats["totals"]["count"] == 0


def test_gather_stats_treats_shared_as_library(fresh_main):
    main, skills_dir = fresh_main
    shared = skills_dir / "_shared"
    shared.mkdir(parents=True)
    (shared / "vault.py").write_text("x = 1\ny = 2\n")
    (shared / "test_vault.py").write_text("def t(): pass\n")

    stats = main.gather_stats()
    # Shared is not counted as a skill
    assert stats["totals"]["count"] == 0
    # But it should appear in the rows
    shared_rows = [s for s in stats["skills"] if s["name"] == "_shared"]
    assert len(shared_rows) == 1
    assert shared_rows[0]["kind"] == "library"


def test_telegram_summary_includes_numbers(fresh_main):
    main, _ = fresh_main
    stats = {
        "skills": [],
        "totals": {"count": 20, "loc": 5000, "test_loc": 2000, "tested": 18,
                   "test_coverage_pct": 90, "avg_age_days": 12},
    }
    out = main.render_telegram_summary(stats)
    assert "20" in out
    assert "5,000" in out
    assert "90%" in out


def test_report_shows_health_warning_below_60(fresh_main):
    main, _ = fresh_main
    stats = {
        "skills": [],
        "totals": {"count": 5, "loc": 100, "test_loc": 10, "tested": 1,
                   "test_coverage_pct": 20, "avg_age_days": 5},
    }
    report = main.render_report(stats)
    assert "below 60%" in report or "⚠️" in report


def test_report_shows_health_good_above_80(fresh_main):
    main, _ = fresh_main
    stats = {
        "skills": [],
        "totals": {"count": 10, "loc": 1000, "test_loc": 500, "tested": 9,
                   "test_coverage_pct": 90, "avg_age_days": 5},
    }
    report = main.render_report(stats)
    assert "above 80" in report or "solid" in report.lower()


def test_report_flags_old_catalog(fresh_main):
    main, _ = fresh_main
    stats = {
        "skills": [],
        "totals": {"count": 5, "loc": 100, "test_loc": 50, "tested": 5,
                   "test_coverage_pct": 100, "avg_age_days": 120},
    }
    report = main.render_report(stats)
    assert "skill-trim" in report
