"""Validate a manual RGBA mask repair and repack one runtime clip."""

import argparse
import json
import re
from pathlib import Path

from PIL import Image

from scripts.underwater_v2.pack import pack_sheet


FRAME_NAME = re.compile(r"^frame-(\d{3})\.png$")


def _load_rgba(path: Path, expected_size: tuple[int, int]) -> Image.Image:
    with Image.open(path) as source:
        if source.mode != "RGBA":
            raise ValueError(f"{path} must be an RGBA PNG")
        if source.size != expected_size:
            raise ValueError(
                f"{path} must stay on the fixed {expected_size[0]}x{expected_size[1]} canvas"
            )
        return source.copy()


def _contact_frames(frames: list[Image.Image]) -> list[Image.Image]:
    preview_size = (frames[0].width // 4, frames[0].height // 4)
    return [
        frame.convert("RGBa")
        .resize(preview_size, Image.Resampling.LANCZOS)
        .convert("RGBA")
        for frame in frames
    ]


def repack_clip(clip_dir: Path, replacement: Path | None = None) -> None:
    """Apply one same-named manual frame, then rebuild its sheets."""
    clip_dir = Path(clip_dir)
    manifest_path = clip_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected_size = (manifest["frame_width"], manifest["frame_height"])
    frame_count = manifest["frames"]
    columns = manifest["columns"]
    frame_paths = [
        clip_dir / "frames" / f"frame-{index:03d}.png"
        for index in range(frame_count)
    ]
    frames = [_load_rgba(path, expected_size) for path in frame_paths]

    if replacement is not None:
        replacement = Path(replacement)
        match = FRAME_NAME.fullmatch(replacement.name)
        if match is None:
            raise ValueError("manual replacement must keep its frame-###.png filename")
        index = int(match.group(1))
        if index >= frame_count:
            raise ValueError("manual replacement frame is outside the clip manifest")
        repaired = _load_rgba(replacement, expected_size)
        frames[index] = repaired
        repaired.save(frame_paths[index])

    pack_sheet(frames, columns, clip_dir / "sheet.png")
    pack_sheet(_contact_frames(frames), columns, clip_dir / "contact-sheet.png")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply an optional manual RGBA repair and repack one sprite clip."
    )
    parser.add_argument("clip_dir", type=Path)
    parser.add_argument("--replacement", type=Path)
    args = parser.parse_args()
    repack_clip(args.clip_dir, args.replacement)
    print(f"Repacked {args.clip_dir}")


if __name__ == "__main__":
    main()
