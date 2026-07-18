from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

from PIL import Image

from scripts.underwater_v2.matte import estimate_border_key, key_to_alpha
from scripts.underwater_v2.pack import pack_sheet, write_manifest


class RendererTests(TestCase):
    def test_border_key_becomes_transparent_without_erasing_subject(self):
        image = Image.new("RGB", (12, 12), (255, 238, 3))
        for y in range(3, 9):
            for x in range(3, 9):
                image.putpixel((x, y), (8, 128, 126))

        self.assertEqual(estimate_border_key(image), (255, 238, 3))

        result = key_to_alpha(image)

        self.assertEqual(result.mode, "RGBA")
        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertEqual(result.getpixel((5, 5))[3], 255)

    def test_sheet_preserves_frame_order_and_dimensions(self):
        frames = [
            Image.new("RGBA", (4, 3), (index, 0, 0, 255))
            for index in range(6)
        ]
        with TemporaryDirectory() as directory:
            output_path = Path(directory) / "nested" / "sheet.png"

            size = pack_sheet(frames, 3, output_path)

            self.assertEqual(size, (12, 6))
            with Image.open(output_path) as sheet:
                self.assertEqual(sheet.getpixel((0, 0)), (0, 0, 0, 255))
                self.assertEqual(sheet.getpixel((4, 0)), (1, 0, 0, 255))
                self.assertEqual(sheet.getpixel((0, 3)), (3, 0, 0, 255))

    def test_sheet_rejects_empty_or_mismatched_frames(self):
        with TemporaryDirectory() as directory:
            output_path = Path(directory) / "sheet.png"
            with self.assertRaisesRegex(ValueError, "at least one frame"):
                pack_sheet([], 3, output_path)
            with self.assertRaisesRegex(ValueError, "same dimensions"):
                pack_sheet(
                    [
                        Image.new("RGBA", (4, 3)),
                        Image.new("RGBA", (5, 3)),
                    ],
                    2,
                    output_path,
                )

    def test_manifest_is_stable_and_complete(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "nested" / "manifest.json"

            write_manifest(
                path,
                frame_width=768,
                frame_height=432,
                frames=8,
                columns=4,
                fps=8,
                loop=True,
            )

            self.assertEqual(
                path.read_text(encoding="utf-8"),
                "{\n"
                '  "frame_width": 768,\n'
                '  "frame_height": 432,\n'
                '  "frames": 8,\n'
                '  "columns": 4,\n'
                '  "fps": 8,\n'
                '  "loop": true\n'
                "}\n",
            )
