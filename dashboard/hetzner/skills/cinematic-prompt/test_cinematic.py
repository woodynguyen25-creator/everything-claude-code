"""Unit tests for /cinematic. No network."""

import pytest


@pytest.fixture
def fresh_main(monkeypatch):
    import importlib
    import main
    importlib.reload(main)
    monkeypatch.setattr(main, "vault", None)
    yield main


def test_empty_input_returns_usage(fresh_main):
    out = fresh_main.run({"text": ""})
    assert "Usage:" in out["reply"]


def test_parse_args_default_mode_is_video(fresh_main):
    idea, flags = fresh_main.parse_args("dragon emerging from smoke")
    assert idea == "dragon emerging from smoke"
    assert flags["mode"] == "video"
    assert flags["style_preset"] is None


def test_parse_args_image_flag(fresh_main):
    idea, flags = fresh_main.parse_args("ivermectin bottle --image")
    assert flags["mode"] == "image"
    assert "ivermectin bottle" in idea
    assert "--image" not in idea


def test_parse_args_solo_store_preset(fresh_main):
    idea, flags = fresh_main.parse_args("tretinoin --solo-store --image")
    assert flags["style_preset"] == "solo-store"
    assert flags["mode"] == "image"


def test_parse_args_lucky_dog_preset(fresh_main):
    idea, flags = fresh_main.parse_args("hero animation --lucky-dog")
    assert flags["style_preset"] == "lucky-dog"


def test_parse_args_captures_negative(fresh_main):
    idea, flags = fresh_main.parse_args("dragon --negative cartoon, anime")
    assert flags["negative_addition"] == "cartoon, anime"
    assert "dragon" in idea
    assert "--negative" not in idea


def test_build_system_prompt_video_default(fresh_main):
    flags = {"mode": "video", "style_preset": None, "negative_addition": ""}
    prompt = fresh_main.build_system_prompt(flags)
    assert "VIDEO" in prompt
    assert "camera motion" in prompt.lower()


def test_build_system_prompt_image(fresh_main):
    flags = {"mode": "image", "style_preset": None, "negative_addition": ""}
    prompt = fresh_main.build_system_prompt(flags)
    assert "IMAGE" in prompt
    assert "do not describe camera motion" in prompt.lower()


def test_build_system_prompt_solo_store(fresh_main):
    flags = {"mode": "image", "style_preset": "solo-store", "negative_addition": ""}
    prompt = fresh_main.build_system_prompt(flags)
    assert "STYLE LOCK" in prompt
    assert "Theros" in prompt
    assert "photoreal" in prompt.lower()


def test_build_system_prompt_lucky_dog(fresh_main):
    flags = {"mode": "video", "style_preset": "lucky-dog", "negative_addition": ""}
    prompt = fresh_main.build_system_prompt(flags)
    assert "Active Theory" in prompt
    assert "orange" in prompt.lower()


def test_build_system_prompt_includes_negative_addition(fresh_main):
    flags = {"mode": "video", "style_preset": None, "negative_addition": "cartoon, anime"}
    prompt = fresh_main.build_system_prompt(flags)
    assert "cartoon, anime" in prompt


def test_run_flags_only_returns_warning(fresh_main):
    out = fresh_main.run({"text": "--lucky-dog --video"})
    assert "no actual idea" in out["reply"].lower() or "subject" in out["reply"].lower()


def test_run_workers_unavailable(fresh_main, monkeypatch):
    monkeypatch.setattr(fresh_main, "workers", None)
    out = fresh_main.run({"text": "dragon hero shot"})
    assert "unavailable" in out["reply"].lower()
