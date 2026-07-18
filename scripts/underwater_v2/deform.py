"""Identity-safe local deformation helpers for Liliana's approved anchors."""

from math import pi, sin, tau

from PIL import Image, ImageDraw, ImageFilter


def tail_wave(
    frame: Image.Image,
    phase: float,
    hinge_x: float = 0.58,
    amplitude_px: int = 26,
) -> Image.Image:
    """Wave pixels left of the tail hinge while leaving the upper body untouched."""
    source = frame.convert("RGBA")
    hinge_px = round(source.width * hinge_x)
    result = source.copy()

    for x in range(max(0, hinge_px)):
        progress = max(0.0, min(1.0, (hinge_px - x) / max(1, hinge_px)))
        offset_y = round(
            sin(phase * tau + progress * pi * 1.4)
            * amplitude_px
            * progress**1.7
        )
        if offset_y == 0:
            continue
        column = source.crop((x, 0, x + 1, source.height))
        result.paste((0, 0, 0, 0), (x, 0, x + 1, source.height))
        result.alpha_composite(column, (x, offset_y))

    return result


def blend_expression(
    idle: Image.Image,
    laugh: Image.Image,
    amount: float,
    face_box: tuple[float, float, float, float],
) -> Image.Image:
    """Blend only a feathered face ellipse; all pixels outside it stay unchanged."""
    if idle.size != laugh.size:
        raise ValueError("expression anchors must have the same dimensions")

    base = idle.convert("RGBA")
    alternate = laugh.convert("RGBA")
    amount = max(0.0, min(1.0, amount))
    if amount == 0:
        return base.copy()

    left = round(face_box[0] * base.width)
    top = round(face_box[1] * base.height)
    right = round(face_box[2] * base.width)
    bottom = round(face_box[3] * base.height)
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).ellipse((left, top, right, bottom), fill=255)
    feather = max(1, round(min(right - left, bottom - top) * 0.045))
    mask = mask.filter(ImageFilter.GaussianBlur(feather))

    blended = Image.blend(base, alternate, amount)
    return Image.composite(blended, base, mask)
