"""Render the six approved underwater object anchors into deterministic clips."""

from __future__ import annotations

import sys
from math import cos, pi, sin, tau
from pathlib import Path
from typing import Final

from PIL import Image, ImageDraw

if __package__ in {None, ""}:
    repository_root = str(Path(__file__).resolve().parents[2])
    if repository_root not in sys.path:
        sys.path.insert(0, repository_root)

from scripts.underwater_v2.deform import tail_wave
from scripts.underwater_v2.matte import estimate_border_key, key_to_alpha
from scripts.underwater_v2.pack import pack_sheet, write_manifest


FRAME_SIZE: Final = (768, 432)
OBJECT_SPECS: Final = {
    "pearl-shell": {"frames": 8, "columns": 4, "fps": 8, "loop": False},
    "fish-courier": {"frames": 10, "columns": 5, "fps": 10, "loop": True},
    "sea-turtle": {"frames": 10, "columns": 5, "fps": 10, "loop": True},
    "treasure-chest": {"frames": 8, "columns": 4, "fps": 8, "loop": False},
    "jellyfish": {"frames": 8, "columns": 4, "fps": 8, "loop": True},
    "crab": {"frames": 8, "columns": 4, "fps": 8, "loop": True},
}


def _repository_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _default_sources(root: Path) -> dict[str, Path]:
    return {
        asset_id: root / f"spriterrific-runs/{asset_id}/reference/anchor-source.png"
        for asset_id in OBJECT_SPECS
    }


def _open_source(source: Image.Image | Path | str) -> Image.Image:
    if isinstance(source, Image.Image):
        return source.copy()
    with Image.open(source) as image:
        return image.copy()


def _fit_anchor(source: Image.Image, frame_size: tuple[int, int]) -> Image.Image:
    keyed = key_to_alpha(source)
    visible = keyed.getchannel("A").point(lambda value: 255 if value >= 2 else 0)
    bounds = visible.getbbox()
    if bounds is None:
        raise ValueError("object source contains no visible pixels after keying")
    cropped = keyed.crop(bounds)
    padding = max(12, round(min(frame_size) * 0.25))
    available = (frame_size[0] - padding * 2, frame_size[1] - padding * 2)
    scale = min(available[0] / cropped.width, available[1] / cropped.height)
    fitted_size = (
        max(1, round(cropped.width * scale)),
        max(1, round(cropped.height * scale)),
    )
    fitted = cropped.convert("RGBa").resize(
        fitted_size,
        Image.Resampling.LANCZOS,
    ).convert("RGBA")
    canvas = Image.new("RGBA", frame_size)
    canvas.alpha_composite(
        fitted,
        (
            (frame_size[0] - fitted.width) // 2,
            (frame_size[1] - fitted.height) // 2,
        ),
    )
    _validate_bounds(canvas)
    return canvas


def _validate_bounds(frame: Image.Image, margin: int = 8) -> None:
    bounds = frame.getchannel("A").point(
        lambda value: 255 if value >= 2 else 0
    ).getbbox()
    if bounds is None:
        raise ValueError("rendered object contains no visible pixels")
    left, top, right, bottom = bounds
    if (
        left < margin
        or top < margin
        or frame.width - right < margin
        or frame.height - bottom < margin
    ):
        raise ValueError(f"rendered object violates safe canvas bounds: {bounds}")


def _rotate_segment(
    frame: Image.Image,
    box: tuple[float, float, float, float],
    hinge: tuple[float, float],
    angle: float,
) -> Image.Image:
    source = frame.convert("RGBA")
    pixels = (
        round(box[0] * source.width),
        round(box[1] * source.height),
        round(box[2] * source.width),
        round(box[3] * source.height),
    )
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).rectangle(pixels, fill=255)
    segment = Image.new("RGBA", source.size)
    segment.paste(source, mask=mask)
    base = source.copy()
    base.paste((0, 0, 0, 0), pixels)
    rotated = segment.rotate(
        angle,
        resample=Image.Resampling.BICUBIC,
        center=(round(hinge[0] * source.width), round(hinge[1] * source.height)),
    )
    base.alpha_composite(rotated)
    return base


def _lift_segment(
    frame: Image.Image,
    box: tuple[float, float, float, float],
    lift_px: int,
) -> Image.Image:
    """Lift a lid and stretch its real seam texture across the revealed interior."""
    source = frame.convert("RGBA")
    if lift_px <= 0:
        return source.copy()
    left = round(box[0] * source.width)
    top = round(box[1] * source.height)
    right = round(box[2] * source.width)
    split_y = round(box[3] * source.height)
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).rectangle((left, top, right, split_y), fill=255)
    segment = Image.new("RGBA", source.size)
    segment.paste(source, mask=mask)
    base = source.copy()
    base.paste((0, 0, 0, 0), mask=mask)

    strip_top = max(0, split_y - 3)
    strip_bottom = min(source.height, split_y + 3)
    interior = source.crop((left, strip_top, right, strip_bottom))
    interior = interior.convert("RGBa").resize(
        (max(1, right - left), lift_px),
        Image.Resampling.BICUBIC,
    ).convert("RGBA")
    base.alpha_composite(interior, (left, split_y - lift_px))
    base.alpha_composite(segment, (0, -lift_px))
    return base


def _rotate_whole(frame: Image.Image, angle: float) -> Image.Image:
    return frame.rotate(
        angle,
        resample=Image.Resampling.BICUBIC,
        center=(frame.width // 2, frame.height // 2),
    )


def _translate(frame: Image.Image, y_offset: int, x_offset: int = 0) -> Image.Image:
    if y_offset == 0 and x_offset == 0:
        return frame.copy()
    moved = Image.new("RGBA", frame.size)
    moved.alpha_composite(frame, (x_offset, y_offset))
    return moved


def _pulse(frame: Image.Image, scale_y: float) -> Image.Image:
    height = max(1, round(frame.height * scale_y))
    scaled = frame.convert("RGBa").resize(
        (frame.width, height),
        Image.Resampling.BICUBIC,
    ).convert("RGBA")
    canvas = Image.new("RGBA", frame.size)
    canvas.alpha_composite(scaled, (0, (frame.height - height) // 2))
    return canvas


def _wave_lower(
    frame: Image.Image,
    phase: float,
    start_y: float = 0.55,
    amplitude_px: int = 5,
) -> Image.Image:
    source = frame.convert("RGBA")
    result = source.copy()
    first_row = round(source.height * start_y)
    for y in range(first_row, source.height):
        progress = (y - first_row) / max(1, source.height - first_row)
        offset = round(
            sin(phase * tau + progress * pi * 1.25)
            * amplitude_px
            * progress**1.4
        )
        if offset == 0:
            continue
        row = source.crop((0, y, source.width, y + 1))
        result.paste((0, 0, 0, 0), (0, y, source.width, y + 1))
        result.alpha_composite(row, (offset, y))
    return result


def _render_asset(
    asset_id: str,
    anchor: Image.Image,
    frame_size: tuple[int, int],
) -> list[Image.Image]:
    count = OBJECT_SPECS[asset_id]["frames"]
    scale = frame_size[0] / FRAME_SIZE[0]
    frames = []
    for index in range(count):
        phase = index / count
        loop = sin(phase * tau)
        ease = 0.5 - 0.5 * cos((index / max(1, count - 1)) * pi)
        if asset_id == "pearl-shell":
            frame = _lift_segment(
                anchor,
                (0.08, 0.08, 0.92, 0.54),
                round(max(2, 12 * scale) * ease),
            )
        elif asset_id == "fish-courier":
            frame = tail_wave(
                anchor,
                phase,
                hinge_x=0.29,
                amplitude_px=max(2, round(11 * scale)),
            )
            frame = _translate(
                _rotate_whole(frame, loop * 1.5),
                round(loop * 2 * scale),
                round(cos(phase * tau) * 2 * scale),
            )
        elif asset_id == "sea-turtle":
            frame = _rotate_segment(
                anchor,
                (0.53, 0.46, 0.95, 0.92),
                (0.59, 0.52),
                loop * 7,
            )
            frame = _translate(
                _rotate_whole(frame, loop * 1.2),
                round(loop * 2 * scale),
                round(cos(phase * tau) * 2 * scale),
            )
        elif asset_id == "treasure-chest":
            frame = _lift_segment(
                anchor,
                (0.11, 0.10, 0.90, 0.52),
                round(max(2, 16 * scale) * ease),
            )
        elif asset_id == "jellyfish":
            frame = _pulse(anchor, 1 + 0.035 * loop)
            frame = _wave_lower(
                frame,
                phase,
                start_y=0.45,
                amplitude_px=max(2, round(8 * scale)),
            )
        elif asset_id == "crab":
            angles = [0, 6, 12, 18, 12, 6, 2, 0]
            frame = _rotate_segment(
                anchor,
                (0.62, 0.04, 0.98, 0.48),
                (0.66, 0.47),
                angles[index] * 0.7,
            )
        else:
            raise KeyError(f"unsupported object asset: {asset_id}")
        _validate_bounds(frame)
        frames.append(frame)
    return frames


def _save_preserved(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        with Image.open(path) as existing:
            converted = existing.convert(image.mode)
            if converted.size != image.size or converted.tobytes() != image.tobytes():
                raise FileExistsError(f"refusing to overwrite unmasked artifact: {path}")
        return
    image.save(path)


def _matte_backed(
    frame: Image.Image,
    key: tuple[int, int, int],
) -> Image.Image:
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


def render_object_clips(
    sources: dict[str, Image.Image | Path | str] | None,
    output_dir: Path,
    *,
    archive_root: Path | None = None,
    frame_size: tuple[int, int] = FRAME_SIZE,
) -> dict[str, list[Image.Image]]:
    """Render all object clips while retaining removable-matte repair copies."""
    root = _repository_root()
    sources = sources or _default_sources(root)
    archive_root = archive_root or root / "spriterrific-runs/object-rig-v3"
    output_dir = Path(output_dir)
    if set(sources) != set(OBJECT_SPECS):
        raise ValueError("object sources must match the exact underwater-v2 cast")

    rendered: dict[str, list[Image.Image]] = {}
    for asset_id, source in sources.items():
        raw = _open_source(source)
        anchor = _fit_anchor(raw, frame_size)
        frames = _render_asset(asset_id, anchor, frame_size)
        rendered[asset_id] = frames
        settings = OBJECT_SPECS[asset_id]
        public_asset = output_dir / asset_id
        public_frames = public_asset / "frames"
        public_frames.mkdir(parents=True, exist_ok=True)
        asset_archive = archive_root / asset_id
        keyed_frames = asset_archive / "keyed"
        raw_frames = asset_archive / "raw-unkeyed/dense-frames"
        selected_frames = asset_archive / "selected-unkeyed"
        keyed_frames.mkdir(parents=True, exist_ok=True)
        anchor.save(keyed_frames / "anchor-rgba.png")
        key = estimate_border_key(raw)
        unmasked_frames = []

        for index, frame in enumerate(frames):
            filename = f"frame-{index:03d}.png"
            frame.save(public_frames / filename)
            frame.save(keyed_frames / filename)
            unmasked = _matte_backed(frame, key)
            _save_preserved(unmasked, raw_frames / filename)
            _save_preserved(unmasked, selected_frames / filename)
            unmasked_frames.append(unmasked.convert("RGBA"))

        pack_sheet(frames, settings["columns"], public_asset / "sheet.png")
        pack_sheet(
            _contact_frames(frames),
            settings["columns"],
            public_asset / "contact-sheet.png",
        )
        raw_contact = asset_archive / "raw-unkeyed/contact-sheets/contact-sheet.png"
        if not raw_contact.exists():
            pack_sheet(
                _contact_frames(unmasked_frames),
                settings["columns"],
                raw_contact,
            )
        write_manifest(
            public_asset / "manifest.json",
            frame_width=frame_size[0],
            frame_height=frame_size[1],
            frames=len(frames),
            columns=settings["columns"],
            fps=settings["fps"],
            loop=settings["loop"],
        )
    return rendered


def main() -> None:
    root = _repository_root()
    clips = render_object_clips(
        None,
        root / "public/images/underwater-v2/interactives",
    )
    counts = ", ".join(f"{name}={len(frames)}" for name, frames in clips.items())
    print(f"Rendered object clips: {counts}")


if __name__ == "__main__":
    main()
