"""Remove a flat chroma backdrop while preserving source RGB pixels."""

from math import sqrt
from statistics import median

from PIL import Image


def estimate_border_key(image: Image.Image) -> tuple[int, int, int]:
    """Estimate a chroma-key color from the median of the image border."""
    rgb = image.convert("RGB")
    width, height = rgb.size
    border = [rgb.getpixel((x, 0)) for x in range(width)]
    if height > 1:
        border.extend(rgb.getpixel((x, height - 1)) for x in range(width))
    if width > 1 and height > 2:
        border.extend(rgb.getpixel((0, y)) for y in range(1, height - 1))
        border.extend(rgb.getpixel((width - 1, y)) for y in range(1, height - 1))
    return tuple(
        round(median(pixel[channel] for pixel in border))
        for channel in range(3)
    )


def key_to_alpha(
    image: Image.Image,
    transparent_distance: int = 18,
    opaque_distance: int = 72,
) -> Image.Image:
    """Convert chroma distance to a smooth alpha channel without repainting RGB."""
    if opaque_distance <= transparent_distance:
        raise ValueError("opaque_distance must be greater than transparent_distance")

    rgb = image.convert("RGB")
    key = estimate_border_key(rgb)
    output = Image.new("RGBA", rgb.size)
    source_pixels = rgb.load()
    output_pixels = output.load()

    for y in range(rgb.height):
        for x in range(rgb.width):
            red, green, blue = source_pixels[x, y]
            distance = sqrt(
                (red - key[0]) ** 2
                + (green - key[1]) ** 2
                + (blue - key[2]) ** 2
            )
            amount = max(
                0.0,
                min(
                    1.0,
                    (distance - transparent_distance)
                    / (opaque_distance - transparent_distance),
                ),
            )
            alpha = round((amount * amount * (3 - 2 * amount)) * 255)
            output_pixels[x, y] = (red, green, blue, alpha)

    return output
