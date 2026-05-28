"""Unit tests for aios-audit. No network. Mocks vault helper."""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest


@pytest.fixture
def isolated(monkeypatch, tmp_path):
    """Point HERMES_HOME at a temp dir so audit reads test fixtures."""
    hermes_home = tmp_path / "hermes"
    skills_dir = hermes_home / "skills"
    skills_dir.mkdir(parents=True)
    monkeypatch.setenv("HERMES_HOME", str(hermes_home))
    import importlib
    import main
    importlib.reload(main)
    yield main, hermes_home


def test_audit_capabilities_empty(isolated):
    main, _ = isolated
    result = main.audit_capabilities()
    assert result["total_skills"] == 0
    assert result["stale_skills"] == []


def test_audit_capabilities_finds_skill(isolated):
    main, home = isolated
    skill = home / "skills" / "voice-note"
    skill.mkdir(parents=True)
    (skill / "skill.yaml").write_text("name: voice-note\n")
    result = main.audit_capabilities()
    assert result["total_skills"] == 1
    assert result["skills"][0]["name"] == "voice-note"


def test_audit_capabilities_ignores_underscore_dirs(isolated):
    main, home = isolated
    shared = home / "skills" / "_shared"
    shared.mkdir(parents=True)
    (shared / "skill.yaml").write_text("name: _shared\n")
    result = main.audit_capabilities()
    assert result["total_skills"] == 0


def test_audit_cadence_no_jobs_file(isolated):
    main, _ = isolated
    result = main.audit_cadence()
    assert "warning" in result


def test_audit_cadence_with_jobs(isolated):
    main, home = isolated
    jobs = {
        "jobs": [
            {"id": "j1", "enabled": True, "on_error": "log_only"},
            {"id": "j2", "enabled": True},  # missing on_error
            {"id": "j3", "enabled": False, "on_error": "log_only"},
        ]
    }
    (home / "jobs.json").write_text(json.dumps(jobs))
    result = main.audit_cadence()
    assert result["total_jobs"] == 3
    assert result["enabled"] == 2
    assert "j3" in result["disabled"]
    assert "j2" in result["missing_error_handler"]
    assert "j1" not in result["missing_error_handler"]


def test_audit_cadence_handles_malformed_json(isolated):
    main, home = isolated
    (home / "jobs.json").write_text("not json {{{")
    result = main.audit_cadence()
    assert "warning" in result


def test_top_findings_summary_all_green(isolated):
    main, _ = isolated
    findings = {
        "capabilities": {"total_skills": 5, "stale_skills": []},
        "cadence": {"missing_error_handler": [], "total_jobs": 3, "enabled": 3, "disabled": []},
        "context": {"intake_present": True},
        "connections": {"bridge_healthy": True},
    }
    assert main.top_findings_summary(findings) == "all green"


def test_top_findings_summary_flags_stale(isolated):
    main, _ = isolated
    findings = {
        "capabilities": {"total_skills": 5, "stale_skills": [{"name": "x"}, {"name": "y"}]},
        "cadence": {"missing_error_handler": [], "total_jobs": 3, "enabled": 3, "disabled": []},
        "context": {"intake_present": True},
        "connections": {"bridge_healthy": True},
    }
    summary = main.top_findings_summary(findings)
    assert "2 stale skills" in summary


def test_top_findings_summary_flags_missing_intake(isolated):
    main, _ = isolated
    findings = {
        "capabilities": {"total_skills": 0, "stale_skills": []},
        "cadence": {"missing_error_handler": [], "total_jobs": 0, "enabled": 0, "disabled": []},
        "context": {"intake_present": False},
        "connections": {"bridge_healthy": True},
    }
    assert "intake.md missing" in main.top_findings_summary(findings)


def test_top_findings_flags_bridge_down(isolated):
    main, _ = isolated
    findings = {
        "capabilities": {"total_skills": 0, "stale_skills": []},
        "cadence": {"missing_error_handler": [], "total_jobs": 0, "enabled": 0, "disabled": []},
        "context": {"intake_present": True},
        "connections": {"bridge_healthy": False},
    }
    assert "bridge unreachable" in main.top_findings_summary(findings).lower()


def test_render_report_includes_all_sections(isolated):
    main, _ = isolated
    findings = {
        "capabilities": {"total_skills": 8, "stale_skills": [{"name": "old"}]},
        "cadence": {"total_jobs": 3, "enabled": 3, "disabled": [], "missing_error_handler": []},
        "context": {"intake_present": True, "memory_files": 44, "newest_memory_mtime": "2026-05-26"},
        "connections": {"bridge_healthy": True},
    }
    report = main.render_report(findings)
    assert "## Capabilities" in report
    assert "## Cadence" in report
    assert "## Context" in report
    assert "## Connections" in report
    assert "## Recommended actions" in report
