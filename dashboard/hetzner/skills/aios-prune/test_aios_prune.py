"""Unit tests for /aios-prune. No network."""

import datetime as dt
import json

import pytest


@pytest.fixture
def fresh_main(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path / "hermes"))
    import importlib
    import main
    importlib.reload(main)
    monkeypatch.setattr(main, "vault", None)
    yield main, tmp_path / "hermes"


def test_no_skills_dir(fresh_main):
    main, _ = fresh_main
    assert main.collect_skills() == []


def test_collects_skill_with_manifest(fresh_main):
    main, home = fresh_main
    skill = home / "skills" / "voice-note"
    skill.mkdir(parents=True)
    (skill / "skill.yaml").write_text("name: voice-note\n")
    (skill / "test_x.py").write_text("def test(): pass")
    found = main.collect_skills()
    assert len(found) == 1
    assert found[0]["name"] == "voice-note"
    assert found[0]["has_tests"] is True
    assert found[0]["protected"] is True


def test_skip_underscore_dirs(fresh_main):
    main, home = fresh_main
    shared = home / "skills" / "_shared"
    shared.mkdir(parents=True)
    (shared / "skill.yaml").write_text("name: _shared\n")
    assert main.collect_skills() == []


def test_no_jobs_file(fresh_main):
    main, _ = fresh_main
    assert main.collect_jobs() == []


def test_collects_jobs(fresh_main):
    main, home = fresh_main
    (home / "jobs.json").write_text(json.dumps({"jobs": [
        {"id": "j1", "enabled": True},
        {"id": "j2", "enabled": False},
    ]}))
    jobs = main.collect_jobs()
    assert len(jobs) == 2


def test_propose_skips_protected_skills(fresh_main):
    main, _ = fresh_main
    skills = [
        {"name": "voice-note", "age_days": 9999, "has_tests": False, "protected": True, "manifest_mtime": "x"},
        {"name": "old-skill",  "age_days": 9999, "has_tests": True,  "protected": False, "manifest_mtime": "x"},
    ]
    proposals = main.propose_deletions(skills, [], {})
    names = [p["name"] for p in proposals["stale_skills"]]
    assert "voice-note" not in names
    assert "old-skill" in names


def test_propose_untested_low_activity(fresh_main):
    main, _ = fresh_main
    skills = [
        {"name": "tested",   "age_days": 5,  "has_tests": True,  "protected": False, "manifest_mtime": "x"},
        {"name": "untested", "age_days": 5,  "has_tests": False, "protected": False, "manifest_mtime": "x"},
    ]
    activity = {"tested": {"runs": 0, "last_seen": "", "successes": 0}}
    proposals = main.propose_deletions(skills, [], activity)
    names = [p["name"] for p in proposals["untested_skills"]]
    assert "untested" in names
    assert "tested" not in names  # has tests, so excluded regardless of activity


def test_propose_idle_job_no_activity(fresh_main):
    main, _ = fresh_main
    jobs = [{"id": "ghost-job", "enabled": True}]
    proposals = main.propose_deletions([], jobs, {})
    names = [p["name"] for p in proposals["idle_jobs"]]
    assert "ghost-job" in names


def test_propose_idle_job_old_activity(fresh_main):
    main, _ = fresh_main
    jobs = [{"id": "j1", "enabled": True}]
    old_ts = (dt.datetime.now() - dt.timedelta(days=45)).isoformat(timespec="seconds")
    activity = {"j1": {"last_seen": old_ts, "runs": 1, "successes": 1}}
    proposals = main.propose_deletions([], jobs, activity)
    names = [p["name"] for p in proposals["idle_jobs"]]
    assert "j1" in names


def test_propose_skips_recent_jobs(fresh_main):
    main, _ = fresh_main
    jobs = [{"id": "j1", "enabled": True}]
    recent_ts = dt.datetime.now().isoformat(timespec="seconds")
    activity = {"j1": {"last_seen": recent_ts, "runs": 5, "successes": 5}}
    proposals = main.propose_deletions([], jobs, activity)
    names = [p["name"] for p in proposals["idle_jobs"]]
    assert "j1" not in names


def test_disabled_jobs_listed(fresh_main):
    main, _ = fresh_main
    jobs = [
        {"id": "active", "enabled": True},
        {"id": "off1", "enabled": False},
        {"id": "off2", "enabled": False},
    ]
    proposals = main.propose_deletions([], jobs, {})
    names = [p["name"] for p in proposals["disabled_jobs"]]
    assert "off1" in names
    assert "off2" in names
    assert "active" not in names


def test_render_telegram_empty_proposals(fresh_main):
    main, _ = fresh_main
    out = main.render_telegram_summary({
        "stale_skills": [], "untested_skills": [], "idle_jobs": [], "disabled_jobs": [],
    })
    assert "AIOS is lean" in out


def test_render_telegram_with_findings(fresh_main):
    main, _ = fresh_main
    out = main.render_telegram_summary({
        "stale_skills": [{"name": "x", "reason": "r", "action": "a"}],
        "untested_skills": [],
        "idle_jobs": [{"name": "j", "reason": "r", "action": "a"}],
        "disabled_jobs": [],
    })
    assert "stale" in out.lower()
    assert "idle" in out.lower()


def test_render_report_includes_all_sections(fresh_main):
    main, _ = fresh_main
    proposals = {
        "stale_skills": [{"name": "a", "reason": "old", "action": "delete"}],
        "untested_skills": [],
        "idle_jobs": [],
        "disabled_jobs": [],
        "keep_questioning": [],
    }
    report = main.render_report(proposals, "no audit yet")
    assert "Stale skills" in report
    assert "Untested skills" in report
    assert "Idle scheduled jobs" in report
    assert "How to apply" in report
