"""Remove a flat chroma backdrop and decontaminate only keyed edge pixels."""

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
    """Convert chroma distance to alpha and remove matte spill from soft edges."""
    if opaque_distance <= transparent_distance:
        raise ValueError("opaque_distance must be greater than transparent_distance")

    rgb = image.convert("RGB")
    key = estimate_border_key(rgb)
    key_spill = min(key[0], key[1]) - key[2]
    yellow_screen = key_spill > 100
    opaque_spill = max(32.0, key_spill * 0.18)
    transparent_spill = max(opaque_spill + 1, key_spill * 0.95)
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
            coverage = amount * amount * (3 - 2 * amount)
            if yellow_screen:
                spill = min(red, green) - blue
                spill_amount = max(
                    0.0,
                    min(
                        1.0,
                        (spill - opaque_spill)
                        / (transparent_spill - opaque_spill),
                    ),
                )
                spill_coverage = 1 - (
                    spill_amount * spill_amount * (3 - 2 * spill_amount)
                )
                coverage = min(coverage, spill_coverage)

            alpha = round(coverage * 255)
            if alpha == 0:
                output_pixels[x, y] = (0, 0, 0, 0)
                continue
            if alpha == 255:
                output_pixels[x, y] = (red, green, blue, 255)
                continue

            coverage = alpha / 255
            if yellow_screen and spill > opaque_spill:
                yellow_excess = max(0, min(red, green) - blue)
                corrected = (
                    max(0, red - yellow_excess),
                    max(0, green - yellow_excess),
                    blue,
                )
            else:
                corrected = tuple(
                    max(
                        0,
                        min(
                            255,
                            round(
                                (channel - key_channel * (1 - coverage))
                                / coverage
                            ),
                        ),
                    )
                    for channel, key_channel in zip((red, green, blue), key)
                )
            output_pixels[x, y] = (*corrected, alpha)

    return output
