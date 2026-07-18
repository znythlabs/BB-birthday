import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

from PIL import Image

from scripts.underwater_v2.deform import blend_expression, tail_wave
from scripts.underwater_v2.matte import estimate_border_key, key_to_alpha
from scripts.underwater_v2.pack import pack_sheet, write_manifest
from scripts.underwater_v2.render_mermaid import render_mermaid_clips


class RendererTests(TestCase):
    def test_renderer_script_resolves_package_from_any_working_directory(self):
        script = (
            Path(__file__).resolve().parents[2]
            / "scripts"
            / "underwater_v2"
            / "render_mermaid.py"
        )
        probe = (
            "import runpy; "
            f"runpy.run_path({str(script)!r}, run_name='renderer_import_probe')"
        )
        with TemporaryDirectory() as directory:
            result = subprocess.run(
                [sys.executable, "-c", probe],
                cwd=directory,
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_tail_wave_protects_face_region(self):
        source = Image.new("RGBA", (96, 54), (0, 0, 0, 0))
        for y in range(8, 46):
            for x in range(6, 91):
                source.putpixel((x, y), (8, 128, 126, 255))
        for y in range(10, 35):
            for x in range(62, 88):
                source.putpixel((x, y), (225, 170, 140, 255))
        face = (round(source.width * 0.60), 0, source.width, round(source.height * 0.65))

        result = tail_wave(source, phase=0.25, hinge_x=0.58, amplitude_px=10)

        self.assertEqual(source.crop(face).tobytes(), result.crop(face).tobytes())
        self.assertNotEqual(source.crop((0, 0, 50, 54)).tobytes(), result.crop((0, 0, 50, 54)).tobytes())

    def test_expression_blend_changes_only_the_face_ellipse(self):
        idle = Image.new("RGBA", (100, 60), (8, 128, 126, 255))
        laugh = idle.copy()
        for y in range(6, 29):
            for x in range(58, 84):
                laugh.putpixel((x, y), (225, 170, 140, 255))

        result = blend_expression(idle, laugh, 1.0, (0.58, 0.08, 0.84, 0.50))

        self.assertEqual(result.getpixel((10, 10)), idle.getpixel((10, 10)))
        self.assertEqual(result.getpixel((71, 17)), laugh.getpixel((71, 17)))

    def test_mermaid_clip_counts_match_contract(self):
        idle = Image.new("RGB", (320, 180), (255, 238, 3))
        laugh = idle.copy()
        for y in range(35, 150):
            for x in range(22, 298):
                idle.putpixel((x, y), (8, 128, 126))
                laugh.putpixel((x, y), (8, 128, 126))
        for y in range(25, 92):
            for x in range(190, 270):
                idle.putpixel((x, y), (225, 170, 140))
                laugh.putpixel((x, y), (235, 180, 150))

        with TemporaryDirectory() as directory:
            root = Path(directory)
            clips = render_mermaid_clips(
                root / "public",
                idle_source=idle,
                laugh_source=laugh,
                archive_root=root / "archive",
                frame_size=(192, 108),
            )

            self.assertEqual(
                {name: len(frames) for name, frames in clips.items()},
                {"idle": 8, "swim": 12, "discover": 10},
            )
            self.assertTrue((root / "public" / "idle" / "manifest.json").is_file())
            self.assertTrue((root / "archive" / "keyed" / "idle" / "frame-000.png").is_file())
            self.assertTrue((root / "archive" / "raw-unkeyed" / "dense-frames" / "idle" / "frame-000.png").is_file())

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

    def test_chroma_edge_is_decontaminated_without_changing_opaque_subject(self):
        image = Image.new("RGB", (8, 8), (255, 238, 3))
        image.putpixel((3, 3), (218, 222, 21))
        image.putpixel((2, 2), (150, 140, 0))
        image.putpixel((4, 4), (8, 128, 126))

        result = key_to_alpha(image)

        edge = result.getpixel((3, 3))
        self.assertGreater(edge[3], 0)
        self.assertLess(edge[3], 255)
        self.assertLess(max(edge[:3]), 40)
        hair_edge = result.getpixel((2, 2))
        self.assertGreater(hair_edge[3], 0)
        self.assertLess(hair_edge[3], 128)
        self.assertLess(max(hair_edge[:3]), 40)
        self.assertEqual(result.getpixel((4, 4)), (8, 128, 126, 255))
        self.assertEqual(result.getpixel((0, 0)), (0, 0, 0, 0))

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
