import hashlib
import json
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

from PIL import Image

from scripts.underwater_v2.deform import blend_expression, tail_wave
from scripts.underwater_v2.matte import estimate_border_key, key_to_alpha
from scripts.underwater_v2.pack import pack_sheet, write_manifest
from scripts.underwater_v2.repack import repack_clip
from scripts.underwater_v2.render_mermaid import render_mermaid_clips
from scripts.underwater_v2.render_objects import render_object_clips


class RendererTests(TestCase):
    def test_accepted_runtime_exports_are_complete_motion_advancing_and_padded(self):
        repository = Path(__file__).resolve().parents[2]
        clips = {
            "mermaid/idle": 8,
            "mermaid/swim": 12,
            "mermaid/discover": 10,
            "interactives/pearl-shell": 8,
            "interactives/fish-courier": 10,
            "interactives/sea-turtle": 10,
            "interactives/treasure-chest": 8,
            "interactives/jellyfish": 8,
            "interactives/crab": 8,
        }
        total = 0
        for clip_name, expected_count in clips.items():
            clip = repository / "public" / "images" / "underwater-v2" / clip_name
            manifest = json.loads((clip / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["frames"], expected_count)
            digests = []
            for index in range(expected_count):
                frame_path = clip / "frames" / f"frame-{index:03d}.png"
                with Image.open(frame_path) as frame:
                    self.assertEqual(frame.mode, "RGBA")
                    self.assertEqual(frame.size, (768, 432))
                    bounds = frame.getchannel("A").getbbox()
                    self.assertIsNotNone(bounds)
                    left, top, right, bottom = bounds
                    self.assertGreaterEqual(min(left, top, 768 - right, 432 - bottom), 12)
                    digests.append(hashlib.sha256(frame.tobytes()).digest())
            self.assertGreaterEqual(len(set(digests)), (expected_count + 1) // 2)
            self.assertTrue(
                all(left != right for left, right in zip(digests, digests[1:]))
            )
            total += expected_count
        self.assertEqual(total, 82)

    def test_green_chroma_edge_is_decontaminated(self):
        image = Image.new("RGB", (8, 8), (0, 255, 0))
        image.putpixel((3, 3), (0, 150, 0))
        image.putpixel((4, 4), (220, 120, 180))

        result = key_to_alpha(image)

        green_edge = result.getpixel((3, 3))
        self.assertGreater(green_edge[3], 0)
        self.assertLess(green_edge[3], 160)
        self.assertLess(green_edge[1], 40)
        self.assertEqual(result.getpixel((4, 4)), (220, 120, 180, 255))

    def test_object_clip_counts_match_contract(self):
        expected = {
            "pearl-shell": 8,
            "fish-courier": 10,
            "sea-turtle": 10,
            "treasure-chest": 8,
            "jellyfish": 8,
            "crab": 8,
        }
        sources = {}
        for index, asset_id in enumerate(expected):
            image = Image.new("RGB", (320, 180), (255, 238, 3))
            for y in range(35, 145):
                for x in range(28, 292):
                    image.putpixel(
                        (x, y),
                        (30 + index * 20, 80 + index * 10, 160 - index * 10),
                    )
            sources[asset_id] = image

        with TemporaryDirectory() as directory:
            root = Path(directory)
            rendered = render_object_clips(
                sources,
                root / "public",
                archive_root=root / "archive",
                frame_size=(192, 108),
            )

            self.assertEqual(
                {name: len(frames) for name, frames in rendered.items()},
                expected,
            )
            for asset_id in ("pearl-shell", "treasure-chest"):
                final_frame = rendered[asset_id][-1]
                seam = final_frame.getpixel(
                    (final_frame.width // 2, round(final_frame.height * 0.53))
                )
                self.assertGreater(
                    seam[3],
                    0,
                    f"{asset_id} must retain an opaque interior at its open seam",
                )
            for asset_id in expected:
                self.assertTrue((root / "public" / asset_id / "manifest.json").is_file())
                self.assertTrue((root / "archive" / asset_id / "raw-unkeyed" / "dense-frames" / "frame-000.png").is_file())

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

    def test_repack_clip_applies_a_validated_manual_mask(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            clip = root / "discover"
            frames = clip / "frames"
            frames.mkdir(parents=True)
            for index in range(2):
                Image.new("RGBA", (8, 6), (index, 0, 0, 255)).save(
                    frames / f"frame-{index:03d}.png"
                )
            write_manifest(
                clip / "manifest.json",
                frame_width=8,
                frame_height=6,
                frames=2,
                columns=2,
                fps=8,
                loop=True,
            )
            replacement = root / "manual-fixes" / "frame-001.png"
            replacement.parent.mkdir(parents=True)
            Image.new("RGBA", (8, 6), (240, 20, 80, 128)).save(replacement)

            repack_clip(clip, replacement)

            with Image.open(frames / "frame-001.png") as repaired:
                self.assertEqual(repaired.getpixel((0, 0)), (240, 20, 80, 128))
            with Image.open(clip / "sheet.png") as sheet:
                self.assertEqual(sheet.size, (16, 6))
                self.assertEqual(sheet.getpixel((8, 0)), (240, 20, 80, 128))
            self.assertTrue((clip / "contact-sheet.png").is_file())
