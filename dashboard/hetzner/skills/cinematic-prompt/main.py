"""/cinematic — turn a raw idea into a cinematographer-grade prompt.

Per AI Masterclass video #18 (Sora 2 + n8n agents). Raw user input →
structured prompt covering: subject + setting + camera + lighting + audio +
style references + negative prompt.

Optional mode flags in the input:
  --image           — bias toward image gen (no camera motion, focal-length emphasis)
  --video           — bias toward video gen (camera motion, duration, audio cues)
  --solo-store      — biased toward painterly 2D Theros/Hades style (Woody's NON-NEGOTIABLE)
  --lucky-dog       — biased toward orange/teal cinematic dark, Active Theory / Ash Thorp
  --negative <txt>  — explicit negative prompt addition

Default is `--video` if no mode given.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any, Dict, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from _shared import models as workers  # type: ignore
    from _shared import vault              # type: ignore
except ImportError:
    workers = None
    vault = None


BASE_SYSTEM_PROMPT = """\
You are a cinematographer. Given a raw idea, produce a single dense prompt
suitable for image or video generation. The prompt MUST be:

- One block of comma-separated phrases (not paragraphs, not lists)
- Cinematic vocabulary: focal length, aperture, film stock, lens type,
  grading, key/fill/rim lighting, composition rules
- Explicit about lighting direction and quality (golden hour, hard north
  light, soft north light, gobo-cast)
- Specific about camera move when video: dolly-in, dolly-around, slow push,
  static lock-off, handheld with stabilization
- Concrete on materials and textures (oxidized brass, raw concrete, wet
  asphalt at dusk, fogged glass)
- Always include a "shot on [camera + lens]" tag

DO NOT include:
- Filler words like "stunning, beautiful, amazing"
- Generic AI-art tells like "trending on artstation, 4k, ultra detailed"
- Brand names of competing models
- Quote marks around the prompt itself

Always finish with a `--negative` clause covering the failure modes.
"""

SOLO_STORE_ADDITIONS = """\
- STYLE LOCK (non-negotiable): painterly 2D illustration, Magic the Gathering
  Theros card art × Supergiant Hades. Heavy visible brushwork. NEVER photoreal.
- Palette: rich wine-red, burgundy, abundant antique gold. NO green/teal.
- Format: 4:5 portrait. Add "painterly oil illustration, hand-painted texture,
  visible brushwork" up front.
- Negative: photoreal, 3D render, octane, photograph, modern, sci-fi, cyberpunk.
"""

LUCKY_DOG_ADDITIONS = """\
- STYLE LOCK: cinematic dark luxury. References Active Theory + Ash Thorp.
  Warm cyberpunk: deep orange embers + teal cool shadows. Dark luxury moods.
- Composition: 21:9 anamorphic when possible, otherwise 16:9 cinematic.
- Add lens flare and atmospheric haze (subtle, never overwrought).
- Negative: pastel, daytime, beige, corporate stock, generic flat illustration.
"""


def parse_args(text: str) -> Tuple[str, Dict[str, Any]]:
    """Extract --flags from input. Returns (clean_idea, flags_dict)."""
    flags: Dict[str, Any] = {
        "mode": "video",
        "style_preset": None,
        "negative_addition": "",
    }

    # Capture --negative "..." or --negative ... before stripping other flags
    neg_match = re.search(r"--negative\s+(.+?)(?:\s+--|\s*$)", text)
    if neg_match:
        flags["negative_addition"] = neg_match.group(1).strip()
        text = text[:neg_match.start()] + text[neg_match.end():]

    if "--image" in text:
        flags["mode"] = "image"
        text = text.replace("--image", "")
    elif "--video" in text:
        text = text.replace("--video", "")

    if "--solo-store" in text:
        flags["style_preset"] = "solo-store"
        text = text.replace("--solo-store", "")
    elif "--lucky-dog" in text:
        flags["style_preset"] = "lucky-dog"
        text = text.replace("--lucky-dog", "")

    return text.strip(), flags


def build_system_prompt(flags: Dict[str, Any]) -> str:
    parts = [BASE_SYSTEM_PROMPT]
    if flags["mode"] == "image":
        parts.append("- Mode: IMAGE only. Do not describe camera motion or duration.")
    else:
        parts.append("- Mode: VIDEO. Include camera motion and duration (~5-10s).")
    if flags["style_preset"] == "solo-store":
        parts.append("\n## Style-preset additions:\n" + SOLO_STORE_ADDITIONS)
    elif flags["style_preset"] == "lucky-dog":
        parts.append("\n## Style-preset additions:\n" + LUCKY_DOG_ADDITIONS)
    if flags["negative_addition"]:
        parts.append(
            f"\n## Required negative additions:\n"
            f"- ALSO add to --negative: {flags['negative_addition']}"
        )
    return "\n".join(parts)


def build_user_prompt(idea: str, flags: Dict[str, Any]) -> str:
    mode_label = "video" if flags["mode"] == "video" else "image"
    preset_label = flags["style_preset"] or "no preset (use general cinematic taste)"
    return (
        f"Generate a {mode_label} prompt.\n"
        f"Style preset: {preset_label}\n"
        f"Raw idea:\n\n{idea}\n\n"
        f"Return ONLY the dense comma-separated prompt block, then a blank line, "
        f"then the --negative clause. Nothing else."
    )


def run(event: Dict[str, Any]) -> Dict[str, Any]:
    text = (event.get("text") or "").strip()
    if not text:
        return {
            "reply": (
                "Usage: `/cinematic <idea> [--image|--video] [--solo-store|--lucky-dog] [--negative <terms>]`\n\n"
                "Examples:\n"
                "• `/cinematic dragon emerging from black smoke --lucky-dog --video`\n"
                "• `/cinematic ivermectin bottle on apothecary shelf --solo-store --image`\n"
                "• `/cinematic SPY chart broker office --negative cartoon, anime`"
            )
        }

    idea, flags = parse_args(text)
    if not idea:
        return {"reply": "⚠️ Flags only, no actual idea. Provide a subject."}

    if workers is None:
        return {"reply": "⚠️ shared workers unavailable; can't generate prompt"}

    system = build_system_prompt(flags)
    user = build_user_prompt(idea, flags)

    try:
        result = workers.dispatch(
            "claude-max",
            user,
            system=system,
            max_tokens=1_200,
            allow_fallback=True,
        )
    except workers.WorkerError as exc:  # type: ignore[attr-defined]
        return {"reply": f"⚠️ Prompt generation failed: {exc}"}

    prompt_text = result["text"].strip()
    fallback_note = ""
    if result.get("fallback_used"):
        fallback_note = f"\n\n_(fallback: {result['primary_model']} → {result['model']})_"

    if vault is not None:
        try:
            vault.log_activity(
                task="cinematic-prompt",
                outcome="✅",
                summary=f"{flags['mode']} prompt for: {idea[:60]}",
                tokens=result["tokens_in"] + result["tokens_out"],
                cost_usd=result["cost_usd"],
                notes=f"preset={flags['style_preset'] or 'none'}",
            )
        except Exception:
            pass

    reply = (
        f"🎬 *Cinematic prompt — {flags['mode']}*"
        f"{(' · ' + flags['style_preset']) if flags['style_preset'] else ''}\n\n"
        f"```\n{prompt_text}\n```"
        f"{fallback_note}"
    )

    return {
        "reply": reply,
        "prompt": prompt_text,
        "mode": flags["mode"],
        "style_preset": flags["style_preset"],
        "model_used": result["model"],
    }
