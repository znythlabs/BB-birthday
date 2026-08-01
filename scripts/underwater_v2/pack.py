"""Pack fixed-canvas RGBA frames and write deterministic clip manifests."""

import json
from math import ceil
from pathlib import Path
from typing import Iterable

from PIL import Image


def pack_sheet(
    frames: Iterable[Image.Image],
    columns: int,
    output_path: Path,
) -> tuple[int, int]:
    """Pack equally sized frames left-to-right, top-to-bottom."""
    frame_list = list(frames)
    if not frame_list:
        raise ValueError("pack_sheet requires at least one frame")
    if columns <= 0:
        raise ValueError("columns must be greater than zero")

    width, height = frame_list[0].size
    if any(frame.size != (width, height) for frame in frame_list):
        raise ValueError("all frames must have the same dimensions")

    rows = ceil(len(frame_list) / columns)
    sheet = Image.new("RGBA", (width * columns, height * rows))
    for index, frame in enumerate(frame_list):
        position = ((index % columns) * width, (index // columns) * height)
        sheet.alpha_composite(frame.convert("RGBA"), position)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)
    return sheet.size


def write_manifest(
    path: Path,
    *,
    frame_width: int,
    frame_height: int,
    frames: int,
    columns: int,
    fps: int,
    loop: bool,
) -> None:
    """Write the runtime fields in a stable, reviewable order."""
    manifest = {
        "frame_width": frame_width,
        "frame_height": frame_height,
        "frames": frames,
        "columns": columns,
        "fps": fps,
        "loop": loop,
    }
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
