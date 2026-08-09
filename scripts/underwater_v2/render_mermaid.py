"""Render Liliana's approved anchors into deterministic fixed-canvas clips."""

from __future__ import annotations

import sys
from math import sin, tau
from pathlib import Path
from typing import Final

from PIL import Image

if __package__ in {None, ""}:
    repository_root = str(Path(__file__).resolve().parents[2])
    if repository_root not in sys.path:
        sys.path.insert(0, repository_root)

from scripts.underwater_v2.deform import blend_expression, tail_wave
from scripts.underwater_v2.matte import estimate_border_key, key_to_alpha
from scripts.underwater_v2.pack import pack_sheet, write_manifest


FRAME_SIZE: Final = (768, 432)
IDLE_PHASES: Final = [index / 8 for index in range(8)]
SWIM_PHASES: Final = [index / 12 for index in range(12)]
DISCOVER_BLEND: Final = [0.0, 0.08, 0.24, 0.48, 0.76, 1.0, 1.0, 0.88, 0.62, 0.35]
FACE_BOX: Final = (0.58, 0.08, 0.83, 0.48)
CLIP_SETTINGS: Final = {
    "idle": {"columns": 4, "fps": 8, "loop": True},
    "swim": {"columns": 4, "fps": 12, "loop": True},
    "discover": {"columns": 5, "fps": 10, "loop": False},
}


def _repository_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _open_source(source: Image.Image | Path | str) -> Image.Image:
    if isinstance(source, Image.Image):
        return source.copy()
    with Image.open(source) as image:
        return image.copy()


def _fit_anchor(source: Image.Image, frame_size: tuple[int, int]) -> Image.Image:
    keyed = key_to_alpha(source)
    available = (frame_size[0] - 24, frame_size[1] - 24)
    scale = min(available[0] / keyed.width, available[1] / keyed.height)
    fitted_size = (
        max(1, round(keyed.width * scale)),
        max(1, round(keyed.height * scale)),
    )
    fitted = keyed.convert("RGBa").resize(
        fitted_size,
        Image.Resampling.LANCZOS,
    ).convert("RGBA")
    canvas = Image.new("RGBA", frame_size)
    position = (
        (frame_size[0] - fitted.width) // 2,
        (frame_size[1] - fitted.height) // 2,
    )
    canvas.alpha_composite(fitted, position)
    _validate_bounds(canvas)
    return canvas


def _translate(frame: Image.Image, y_offset: int) -> Image.Image:
    if y_offset == 0:
        return frame.copy()
    moved = Image.new("RGBA", frame.size)
    moved.alpha_composite(frame, (0, y_offset))
    _validate_bounds(moved)
    return moved


def _validate_bounds(frame: Image.Image, margin: int = 12) -> None:
    alpha = frame.getchannel("A").point(lambda value: 255 if value >= 2 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("rendered frame contains no visible subject")
    left, top, right, bottom = bounds
    if (
        left < margin
        or top < margin
        or frame.width - right < margin
        or frame.height - bottom < margin
    ):
        raise ValueError(
            f"rendered subject violates the {margin}px safe margin: {bounds}"
        )


def _save_preserved(image: Image.Image, path: Path) -> None:
    """Create an unmasked artifact once; never silently replace it."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        with Image.open(path) as existing:
            if existing.convert(image.mode).size != image.size or existing.convert(
                image.mode
            ).tobytes() != image.tobytes():
                raise FileExistsError(f"refusing to overwrite unmasked artifact: {path}")
        return
    image.save(path)


def _yellow_backed(frame: Image.Image, key: tuple[int, int, int]) -> Image.Image:
    unmasked = Image.new("RGB", frame.size, key)
    unmasked.paste(frame.convert("RGB"), mask=frame.getchannel("A"))
    return unmasked


def _contact_frames(frames: list[Image.Image]) -> list[Image.Image]:
    preview_size = (frames[0].width // 4, frames[0].height // 4)
    return [
        frame.convert("RGBa").resize(preview_size, Image.Resampling.LANCZOS).convert(
            "RGBA"
        )
        for frame in frames
    ]


def _render_frames(
    idle: Image.Image,
    laugh: Image.Image,
    frame_size: tuple[int, int],
) -> dict[str, list[Image.Image]]:
    scale = frame_size[0] / FRAME_SIZE[0]
    idle_frames = [
        _translate(
            tail_wave(idle, phase, amplitude_px=max(1, round(6 * scale))),
            round(sin(phase * tau) * max(1, round(2 * scale))),
        )
        for phase in IDLE_PHASES
    ]
    swim_frames = [
        _translate(
            tail_wave(idle, phase, amplitude_px=max(2, round(18 * scale))),
            round(sin(phase * tau) * max(1, round(3 * scale))),
        )
        for phase in SWIM_PHASES
    ]
    discover_frames = []
    for index, amount in enumerate(DISCOVER_BLEND):
        phase = index / len(DISCOVER_BLEND)
        expression = blend_expression(idle, laugh, amount, FACE_BOX)
        discover_frames.append(
            _translate(
                tail_wave(
                    expression,
                    phase,
                    amplitude_px=max(1, round(7 * scale)),
                ),
                round(sin(phase * tau) * max(1, round(2 * scale))),
            )
        )
    return {
        "idle": idle_frames,
        "swim": swim_frames,
        "discover": discover_frames,
    }


def render_mermaid_clips(
    output_dir: Path,
    *,
    idle_source: Image.Image | Path | str | None = None,
    laugh_source: Image.Image | Path | str | None = None,
    archive_root: Path | None = None,
    frame_size: tuple[int, int] = FRAME_SIZE,
) -> dict[str, list[Image.Image]]:
    """Render all three clips and preserve keyed plus removable-matte frames."""
    root = _repository_root()
    idle_source = idle_source or (
        root / "spriterrific-runs/mermaid-smile/reference/anchor-source.png"
    )
    laugh_source = laugh_source or (
        root / "spriterrific-runs/mermaid-laugh/reference/anchor-source.png"
    )
    archive_root = archive_root or root / "spriterrific-runs/mermaid-direct-rig-v3"
    output_dir = Path(output_dir)

    idle_raw = _open_source(idle_source)
    laugh_raw = _open_source(laugh_source)
    if idle_raw.size != laugh_raw.size:
        raise ValueError("approved Liliana anchors must have the same dimensions")

    idle = _fit_anchor(idle_raw, frame_size)
    laugh = _fit_anchor(laugh_raw, frame_size)
    keyed_anchor_dir = archive_root / "keyed/anchors"
    keyed_anchor_dir.mkdir(parents=True, exist_ok=True)
    idle.save(keyed_anchor_dir / "idle-rgba.png")
    laugh.save(keyed_anchor_dir / "laugh-rgba.png")

    clips = _render_frames(idle, laugh, frame_size)
    chroma_key = estimate_border_key(idle_raw)

    for clip_name, frames in clips.items():
        settings = CLIP_SETTINGS[clip_name]
        public_clip = output_dir / clip_name
        public_frames = public_clip / "frames"
        public_frames.mkdir(parents=True, exist_ok=True)
        keyed_frames = archive_root / "keyed" / clip_name
        raw_frames = archive_root / "raw-unkeyed/dense-frames" / clip_name
        selected_frames = archive_root / "selected-unkeyed" / clip_name

        unmasked_clip = []
        for index, frame in enumerate(frames):
            _validate_bounds(frame)
            filename = f"frame-{index:03d}.png"
            frame.save(public_frames / filename)
            keyed_frames.mkdir(parents=True, exist_ok=True)
            frame.save(keyed_frames / filename)
            unmasked = _yellow_backed(frame, chroma_key)
            _save_preserved(unmasked, raw_frames / filename)
            _save_preserved(unmasked, selected_frames / filename)
            unmasked_clip.append(unmasked.convert("RGBA"))

        pack_sheet(frames, settings["columns"], public_clip / "sheet.png")
        pack_sheet(
            _contact_frames(frames),
            settings["columns"],
            public_clip / "contact-sheet.png",
        )
        raw_contact = archive_root / "raw-unkeyed/contact-sheets" / f"{clip_name}.png"
        if not raw_contact.exists():
            pack_sheet(
                _contact_frames(unmasked_clip),
                settings["columns"],
                raw_contact,
            )
        write_manifest(
            public_clip / "manifest.json",
            frame_width=frame_size[0],
            frame_height=frame_size[1],
            frames=len(frames),
            columns=settings["columns"],
            fps=settings["fps"],
            loop=settings["loop"],
        )

    return clips


def main() -> None:
    raise SystemExit("Liliana sprite export removed; use public/images/mermaid/mermaid-transparent.webm")


if __name__ == "__main__":
    main()
