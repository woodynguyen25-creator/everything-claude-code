#!/usr/bin/env python3
"""Launch claudex-loop's runner safely on Woody's machine. Same arguments as runner.py.

WHY THIS EXISTS (2026-09-17)
claudex-loop (github.com/chaseai-yt/claudex-loop, vendored at 8cf5e2c) is sound, but on this
machine its runner would have failed or been unsafe three ways:

1. It finds Codex through PATH. The Codex desktop app removed the npm CLI on 2026-09-11; the
   working binary is AppData\\Local\\OpenAI\\Codex\\bin\\<hash>\\codex.exe and <hash> changes on
   every app update. -> resolved here (newest mtime) and passed as --cli.
2. Its Codex reviewer inherits the real ~/.codex: 15 MCP servers including the Robinhood
   TRADING MCP, 27 plugins, ~1,950 skills. The upstream runtime doc itself warns that the
   read-only shell sandbox "is not a restriction on external MCP side effects". -> Codex runs
   under a private CODEX_HOME holding only auth.json and a 3-line config. No MCP at all.
3. That same home costs ~53k tokens before the prompt (measured), against the ChatGPT plan
   allowance the council's Astra seat shares. Five review rounds would burn ~265k tokens of
   overhead. -> the lean home measured ~2.3k.

It also names the plan cap (the upstream runner reports a bare "codex exited 1") and appends
each call to the council ledger so claudex spend is visible next to the council's.

Everything else is delegated unchanged to the upstream runner.
"""
from __future__ import annotations

import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

HOME = Path(os.environ.get("USERPROFILE") or Path.home())
REPO = Path(__file__).resolve().parents[2]
LEDGER = REPO / "dashboard" / "data" / "council-ledger.jsonl"
LEAN_HOME = Path(os.environ.get("CLAUDEX_CODEX_HOME") or HOME / ".codex-claudex")
REAL_CODEX_HOME = HOME / ".codex"
RUNNER_CANDIDATES = [
    HOME / ".claude" / "skills" / "claudex-loop" / "scripts" / "runner.py",
    HOME / ".codex" / "skills" / "claudex-loop" / "scripts" / "runner.py",
]
USAGE_LIMIT = "USAGE-LIMIT"
FORBIDDEN_KEYS = ("mcp_servers", "plugins", "hooks", "marketplaces", "developer_instructions")


def find_runner() -> Path:
    for p in RUNNER_CANDIDATES:
        if p.is_file():
            return p
    raise SystemExit("claudex: runner.py not found — is the claudex-loop skill installed in ~/.claude/skills?")


def native_codex() -> str | None:
    """Newest codex.exe under the desktop app's bin dir; None when the app is not installed."""
    base = Path(os.environ.get("LOCALAPPDATA") or HOME / "AppData" / "Local") / "OpenAI" / "Codex" / "bin"
    exes = [Path(p) for p in glob.glob(str(base / "*" / "codex.exe"))]
    if not exes:
        return None
    return str(max(exes, key=lambda p: p.stat().st_mtime))


def real_config() -> dict:
    try:
        import tomllib
        return tomllib.loads((REAL_CODEX_HOME / "config.toml").read_text(encoding="utf-8"))
    except Exception:
        return {}


def interactive_model() -> tuple[str | None, str | None]:
    """Mirror Woody's own Codex model/effort so 'CLI default' means what he chose."""
    cfg = real_config()
    return cfg.get("model"), cfg.get("model_reasoning_effort")


def windows_sandbox() -> str | None:
    """The real home's [windows] sandbox mode. Without it, Codex on Windows rejects every
    shell command in -s read-only (CreateProcess 'Rejected'): the first live Astra review,
    2026-09-18, could open no file, returned BLOCKED with zero findings, and burned 128k tokens."""
    return (real_config().get("windows") or {}).get("sandbox")


# A model id / effort level is a plain identifier. Anything else is refused rather than
# interpolated: these values are only as trustworthy as whatever last wrote ~/.codex/config.toml,
# and one embedded newline turns this 2-line config into any TOML at all — `notify = [...]` is a
# command Codex runs. Enumerating forbidden keys (FORBIDDEN_KEYS below) cannot cover that; this
# can. Found in review, 2026-09-17.
SAFE_VALUE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]*$")


def lean_config() -> str:
    model, effort = interactive_model()
    lines = []
    for key, value in (("model", model), ("model_reasoning_effort", effort)):
        if not value:
            continue
        if not SAFE_VALUE.match(str(value)):
            raise SystemExit(
                f"claudex: refusing — ~/.codex/config.toml has {key}={value!r}, which is not a "
                "plain identifier. Writing it into the lean config could inject arbitrary TOML.")
        lines.append(f'{key} = "{value}"')
    sandbox = windows_sandbox()
    if sandbox:
        if not SAFE_VALUE.match(str(sandbox)):
            raise SystemExit(f"claudex: refusing — [windows] sandbox={sandbox!r} is not a plain identifier.")
        lines += ["", "[windows]", f'sandbox = "{sandbox}"']
    return "\n".join(lines) + ("\n" if lines else "")


def prepare_lean_home() -> Path:
    """Private CODEX_HOME: auth + model only. Re-copied every run so a rotated token never goes stale."""
    if LEAN_HOME.resolve() == REAL_CODEX_HOME.resolve():
        # Without this the next two lines write a 2-line config over the real one: doctrine,
        # 15 MCP servers and all. It happened to abort on SameFileError; that is not a guard.
        raise SystemExit("claudex: refusing — CLAUDEX_CODEX_HOME points at the real ~/.codex. "
                         "Writing the lean config there would wipe your doctrine and MCP list.")
    LEAN_HOME.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(REAL_CODEX_HOME / "auth.json", LEAN_HOME / "auth.json")
    cfg = lean_config()
    for key in FORBIDDEN_KEYS:
        if re.search(rf"^\s*\[?{key}\b", cfg, re.M):
            raise SystemExit(f"claudex: refusing — lean Codex config would set {key}")
    (LEAN_HOME / "config.toml").write_text(cfg, encoding="utf-8")
    return LEAN_HOME


# Upstream runner.py's long options (argparse, default allow_abbrev). Reading them the way
# argparse does is a SAFETY requirement, not tidiness: a form this file fails to recognise
# still launches the same delegate, but without the lean CODEX_HOME below — i.e. Codex with
# the real ~/.codex and its Robinhood trading MCP.
LONG_OPTIONS = (
    "--host", "--builder", "--provider", "--repo", "--plan", "--model", "--cli", "--effort",
    "--resume", "--feedback", "--base", "--approval", "--unreviewed-spec", "--proof",
    "--artifacts", "--timeout",
)
PROVIDERS = ("claude", "codex")
OTHER = {"claude": "codex", "codex": "claude"}
WORK_MODES = ("review", "build", "inspect")


def resolve_option(token: str) -> str | None:
    """argparse's rule: an exact name, or a prefix that matches exactly one option."""
    if token in LONG_OPTIONS:
        return token
    hits = [o for o in LONG_OPTIONS if o.startswith(token)]
    return hits[0] if len(hits) == 1 else None


def option_value(argv: list[str], name: str) -> str | None:
    """Value of `name` in `--opt v`, `--opt=v` or abbreviated form. Last occurrence wins, as argparse does."""
    found = None
    for i, tok in enumerate(argv):
        if not tok.startswith("--"):
            continue
        head, sep, inline = tok.partition("=")
        if resolve_option(head) != name:
            continue
        if sep:
            found = inline
        elif i + 1 < len(argv) and not argv[i + 1].startswith("--"):
            found = argv[i + 1]
    return found


def provider_for(argv: list[str]) -> str | None:
    """Which CLI this runner call will launch — same rules as runner.resolve_roles.
    None means 'nothing of ours launches here' (roles/check) OR 'cannot tell' — and for a
    mode that does launch something, plan_launch turns 'cannot tell' into a refusal."""
    mode = argv[0] if argv else None
    explicit = option_value(argv, "--provider")
    if explicit in PROVIDERS:
        return explicit
    host = option_value(argv, "--host")
    if mode not in WORK_MODES or host not in PROVIDERS:
        return None
    builder = option_value(argv, "--builder")
    builder = builder if builder in PROVIDERS else host
    return {"review": OTHER[host], "build": builder, "inspect": OTHER[builder]}.get(mode)


def plan_launch(argv: list[str]) -> dict:
    """Pure-ish: decide argv and env without launching. Exposed for tests via --print-launch."""
    provider = provider_for(argv)
    mode = argv[0] if argv else None
    if mode in WORK_MODES and provider is None:
        # Fail CLOSED. Passing an invocation we could not read straight through to the runner
        # would launch a delegate with whatever CODEX_HOME this process inherited.
        raise SystemExit(
            f"claudex: refusing to launch — cannot tell which CLI {argv!r} would start. "
            "Pass --host claude|codex (plus --builder for build/inspect). Launching blind can "
            "hand a Codex delegate the real ~/.codex, Robinhood trading MCP included.")
    args = list(argv)
    env_changes = {}
    if provider == "codex":
        if "--cli" not in args:
            exe = native_codex()
            if exe:
                args += ["--cli", exe]
        env_changes["CODEX_HOME"] = str(LEAN_HOME)
    if argv and argv[0] in ("review", "build", "inspect") and "--artifacts" not in args:
        args += ["--artifacts", str(HOME / ".claudex-runs")]
    return {"provider": provider, "args": args, "env": env_changes}


def failure_reason(text: str) -> str | None:
    """Mirror of council providers.codexFailureReason: name the plan cap and when it lifts."""
    if re.search(r"hit your usage limit", text, re.I):
        when = re.search(r"try again at ([^\r\n]+?)\.?[ \t]*$", text, re.I | re.M)
        return f"{USAGE_LIMIT}: ChatGPT plan cap reached — Codex back {'at ' + when.group(1).strip() if when else 'after the plan window resets'}"
    if re.search(r"usage limit reached|(5-hour|weekly) limit reached", text, re.I):
        return f"{USAGE_LIMIT}: Claude plan limit reached"
    return None


def last_record(stdout: str) -> dict | None:
    """The runner prints one JSON line before launch, then the full record (indented) at the end."""
    start = stdout.rfind("\n{\n")
    blob = stdout[start + 1:] if start != -1 else stdout
    try:
        return json.loads(blob)
    except ValueError:
        return None


def input_tokens(usage: dict) -> int | None:
    """Everything the model actually read. Claude's `input_tokens` counts only UNCACHED input —
    the first live claudex run (2026-09-17) logged 6 when the reviewer read ~18.9k — so the
    cache create/read counts are added. Codex's `input_tokens` already includes cached input."""
    if not usage or usage.get("input_tokens") is None:
        return None
    return sum(int(usage.get(k) or 0) for k in
               ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))


def observed_model(record: dict, provider: str) -> str:
    if record.get("requested_model"):
        return record["requested_model"]
    # Claude reports its internal helper (haiku) alongside the model that did the work.
    seen = [m for m in record.get("observed_models") or [] if "haiku" not in m]
    if seen:
        return seen[0]
    return (interactive_model()[0] if provider == "codex" else None) or f"{provider}-cli-default"


def ledger_row(record: dict, provider: str, ms: int, reason: str | None) -> dict:
    usage = record.get("usage") or {}
    prompt_file = Path(record.get("artifacts", "")) / "prompt.txt"
    prompt_chars = prompt_file.stat().st_size if prompt_file.is_file() else 0
    return {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "provider": provider,
        "model": observed_model(record, provider),
        "ok": record.get("status") == "completed",
        "ms": ms,
        "promptChars": prompt_chars,
        "promptTokens": input_tokens(usage),
        "outputTokens": usage.get("output_tokens"),
        # What this call WOULD cost at API prices. Deliberately not `usd`: both CLIs bill a
        # subscription here, and budget.js sums `usd` as real month-to-date spend.
        "apiEquivUsd": record.get("total_cost_usd"),
        "kind": "claudex",
        "round": None,
        "verdict": (record.get("response") or {}).get("verdict") if isinstance(record.get("response"), dict) else None,
        "tag": f"claudex-{record.get('mode', '')}",
        "error": reason or record.get("error"),
    }


def main(argv: list[str]) -> int:
    if argv and argv[0] == "--print-launch":
        print(json.dumps(plan_launch(argv[1:]), indent=2))
        return 0
    runner = find_runner()
    launch = plan_launch(argv)
    if launch["provider"] == "codex":
        prepare_lean_home()
    env = {**os.environ, **launch["env"]}
    t0 = time.time()
    proc = subprocess.run([sys.executable, str(runner), *launch["args"]], env=env,
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    ms = int((time.time() - t0) * 1000)
    sys.stdout.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    record = last_record(proc.stdout)
    if not record or launch["provider"] is None:
        return proc.returncode
    reason = None
    if record.get("status") != "completed":
        art = Path(record.get("artifacts", ""))
        blob = "".join((art / f).read_text(encoding="utf-8", errors="replace")
                       for f in ("stderr.txt", "stdout.txt") if (art / f).is_file())
        reason = failure_reason(blob)
        if reason:
            print(f"\n[claudex] {reason}. This allowance is shared — the council's seat is out too. "
                  "Stop here; retrying before the reset fails the same way.", file=sys.stderr)
    try:
        with LEDGER.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({k: v for k, v in ledger_row(record, launch["provider"], ms, reason).items()
                                 if v is not None}) + "\n")
    except OSError as exc:
        print(f"[claudex] could not ledger this call: {exc}", file=sys.stderr)
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
