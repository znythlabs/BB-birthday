# Underwater Direct Rig Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all underwater foreground assets with locally rendered multi-frame sprites that preserve Liliana's enhanced pixels exactly and use synchronized silhouette-derived shadows.

**Architecture:** Convert immutable yellow-background anchors into reviewed RGBA sources, then render motion deterministically with fixed-canvas mesh deformation and segment transforms. Pack accepted frames into manifest-driven sheets; one React animation clock drives the visible subject and its exact alpha-derived seabed projection.

**Tech Stack:** Python 3 with Pillow and NumPy, React 19, TypeScript 5.9, CSS transforms/filters, Node.js 22 test runner, Python `unittest`, vinext/Vite.

## Global Constraints

- `public/images/underwater/background-main.png` is immutable.
- `E:/DOWNLOADS/idle.png` and `E:/DOWNLOADS/laugh.png` are the approved Liliana sources.
- Liliana shows exactly two lower teeth and no upper teeth.
- Preserve the lavender bow, magenta sequined shell top, emerald scaled tail, hair, hands, and complete fins.
- Never generatively repaint Liliana or generate her animation frames independently.
- Never overwrite or delete an unmasked source.
- Final counts are idle 8, swim 12, discover 10, shell 8, fish 10, turtle 10, chest 8, jellyfish 8, and crab 8.
- Every frame uses a fixed canvas and stable pivot; overflow fails instead of cropping.
- Every shadow uses the exact active frame alpha. Generic ellipses, blobs, and CSS `drop-shadow()` are forbidden.
- Existing foreground assets stay in place until all `underwater-v2` exports and tests pass.
- Spriterrific is not a production dependency. The fully refunded failed pilot remains historical evidence only.

---

## File and Responsibility Map

- `docs/assets/underwater-v2-production.json`: production contract and exact clip counts.
- `scripts/underwater_v2/matte.py`: border-key estimation and yellow-to-alpha conversion.
- `scripts/underwater_v2/deform.py`: protected-region mesh displacement and anchor blending.
- `scripts/underwater_v2/pack.py`: spritesheet, contact-sheet, and manifest writer.
- `scripts/underwater_v2/render_mermaid.py`: deterministic Liliana clip renderer.
- `scripts/underwater_v2/render_objects.py`: deterministic interactive-object renderer.
- `tests/python/test_underwater_renderer.py`: matte, deformation, bounds, frame-count, and packing tests.
- `public/images/underwater-v2/`: approved runtime frames, sheets, previews, and manifests.
- `data/spriteCatalog.ts`: typed runtime asset catalog.
- `lib/spriteRuntime.mjs`: pure frame timing and sheet-position helpers.
- `lib/underwaterProjection.mjs`: altitude and seabed projection math.
- `components/underwater/SpriteActor.tsx`: synchronized subject and shadow renderer.
- `components/underwater/UnderwaterScene.tsx`: movement, altitude, facing, and action transitions.

---

### Task 1: Revise the production contract for deterministic local rendering

**Files:**
- Modify: `docs/assets/underwater-v2-production.json`
- Modify: `tests/asset-contract.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Produces: exact renderer mode, source files, clip counts, and archive requirements consumed by all later tasks.

- [ ] **Step 1: Add failing contract assertions**

```js
assert.equal(contract.rendering.pipeline, "deterministic-local-rig");
assert.deepEqual(contract.liliana.approvedAnchors, {
  idle: "spriterrific-runs/mermaid-smile/reference/anchor-source.png",
  laugh: "spriterrific-runs/mermaid-laugh/reference/anchor-source.png",
});
assert.deepEqual(contract.liliana.teeth, { lower: 2, upper: 0 });
assert.equal(contract.rendering.generativeFrameEdits, false);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/asset-contract.test.mjs`

Expected: FAIL because `pipeline`, `approvedAnchors`, `teeth`, and `generativeFrameEdits` are absent.

- [ ] **Step 3: Update the contract**

```json
"rendering": {
  "style": "cinematic stylized 3D storybook",
  "pipeline": "deterministic-local-rig",
  "pixelSnap": false,
  "generativeFrameEdits": false,
  "frameSize": [768, 432]
},
"liliana": {
  "approvedAnchors": {
    "idle": "spriterrific-runs/mermaid-smile/reference/anchor-source.png",
    "laugh": "spriterrific-runs/mermaid-laugh/reference/anchor-source.png"
  },
  "teeth": { "lower": 2, "upper": 0 }
}
```

Keep the existing cast, forbidden items, archive directories, and clip counts unchanged.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test tests/asset-contract.test.mjs`

Expected: PASS.

```powershell
git add docs/assets/underwater-v2-production.json tests/asset-contract.test.mjs README.md
git commit -m "docs: define direct underwater rig contract"
```

---

### Task 2: Implement lossless chroma extraction and fixed-canvas packing

**Files:**
- Create: `scripts/underwater_v2/__init__.py`
- Create: `scripts/underwater_v2/matte.py`
- Create: `scripts/underwater_v2/pack.py`
- Create: `tests/python/test_underwater_renderer.py`

**Interfaces:**
- Produces: `estimate_border_key(image) -> tuple[int, int, int]`.
- Produces: `key_to_alpha(image, transparent_distance=18, opaque_distance=72) -> Image.Image`.
- Produces: `pack_sheet(frames, columns, output_path) -> tuple[int, int]`.
- Produces: `write_manifest(path, *, frame_width, frame_height, frames, columns, fps, loop)`.

- [ ] **Step 1: Write failing matte and pack tests**

```python
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from PIL import Image

from scripts.underwater_v2.matte import estimate_border_key, key_to_alpha
from scripts.underwater_v2.pack import pack_sheet

class RendererTests(TestCase):
    def test_border_key_becomes_transparent_without_erasing_subject(self):
        image = Image.new("RGB", (12, 12), (255, 238, 3))
        for y in range(3, 9):
            for x in range(3, 9):
                image.putpixel((x, y), (8, 128, 126))
        self.assertEqual(estimate_border_key(image), (255, 238, 3))
        result = key_to_alpha(image)
        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertEqual(result.getpixel((5, 5))[3], 255)

    def test_sheet_preserves_frame_order_and_dimensions(self):
        frames = [Image.new("RGBA", (4, 3), (index, 0, 0, 255)) for index in range(6)]
        with TemporaryDirectory() as directory:
            size = pack_sheet(frames, 3, Path(directory) / "sheet.png")
            self.assertEqual(size, (12, 6))
```

- [ ] **Step 2: Verify RED**

Run: `python -m unittest discover -s tests/python -p "test_*.py" -v`

Expected: FAIL with `ModuleNotFoundError` for the renderer modules.

- [ ] **Step 3: Implement the matte**

```python
from math import sqrt
from statistics import median
from PIL import Image

def estimate_border_key(image: Image.Image) -> tuple[int, int, int]:
    rgb = image.convert("RGB")
    w, h = rgb.size
    border = [rgb.getpixel((x, 0)) for x in range(w)] + [rgb.getpixel((x, h - 1)) for x in range(w)]
    border += [rgb.getpixel((0, y)) for y in range(1, h - 1)] + [rgb.getpixel((w - 1, y)) for y in range(1, h - 1)]
    return tuple(round(median(pixel[channel] for pixel in border)) for channel in range(3))

def key_to_alpha(image: Image.Image, transparent_distance: int = 18, opaque_distance: int = 72) -> Image.Image:
    rgb = image.convert("RGB")
    key = estimate_border_key(rgb)
    output = Image.new("RGBA", rgb.size)
    pixels = []
    for red, green, blue in rgb.getdata():
        distance = sqrt((red-key[0])**2 + (green-key[1])**2 + (blue-key[2])**2)
        amount = max(0.0, min(1.0, (distance-transparent_distance)/(opaque_distance-transparent_distance)))
        alpha = round((amount*amount*(3-2*amount))*255)
        pixels.append((red, green, blue, alpha))
    output.putdata(pixels)
    return output
```

- [ ] **Step 4: Implement packing and manifests**

```python
import json
from math import ceil
from PIL import Image

def pack_sheet(frames, columns, output_path):
    width, height = frames[0].size
    rows = ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (width * columns, height * rows))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * width, (index // columns) * height))
    sheet.save(output_path)
    return sheet.size

def write_manifest(path, **manifest):
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
```

- [ ] **Step 5: Verify GREEN and commit**

Run: `python -m unittest discover -s tests/python -p "test_*.py" -v`

Expected: PASS.

```powershell
git add scripts/underwater_v2 tests/python
git commit -m "feat: add lossless underwater sprite pipeline"
```

---

### Task 3: Render Liliana's three approved clips

**Files:**
- Create: `scripts/underwater_v2/deform.py`
- Create: `scripts/underwater_v2/render_mermaid.py`
- Modify: `tests/python/test_underwater_renderer.py`
- Create: `public/images/underwater-v2/mermaid/**`

**Interfaces:**
- Consumes: approved idle/laugh RGBA derivatives from Task 2.
- Produces: `tail_wave(frame, phase, hinge_x=0.58, amplitude_px=26)`.
- Produces: `blend_expression(idle, laugh, amount, face_box)`.
- Produces: exact 8/12/10-frame clips with sheets, contact sheets, and manifests.

- [ ] **Step 1: Write failing deformation tests**

```python
def test_tail_wave_protects_face_region(self):
    source = Image.open(self.idle_rgba)
    result = tail_wave(source, phase=0.25, hinge_x=0.58, amplitude_px=26)
    face = (round(source.width * .60), 0, source.width, round(source.height * .65))
    self.assertEqual(source.crop(face).tobytes(), result.crop(face).tobytes())

def test_clip_counts_match_contract(self):
    clips = render_mermaid_clips(self.output_dir)
    self.assertEqual({name: len(frames) for name, frames in clips.items()}, {
        "idle": 8, "swim": 12, "discover": 10,
    })
```

- [ ] **Step 2: Verify RED**

Run: `python -m unittest tests.python.test_underwater_renderer.RendererTests.test_tail_wave_protects_face_region -v`

Expected: FAIL because `tail_wave` does not exist.

- [ ] **Step 3: Implement protected deformation**

Use Pillow `Image.Transform.MESH` with a 32-pixel grid. For each output cell left of `hinge_x`, map its source quad by:

```python
progress = max(0.0, min(1.0, (hinge_x_px - cell_center_x) / hinge_x_px))
offset_y = sin(phase * tau + progress * pi * 1.4) * amplitude_px * progress**1.7
```

Cells right of `hinge_x` use identity quads so the face, bow, torso, and teeth remain byte-identical before the global canvas transform.

- [ ] **Step 4: Implement expression blending and clip phases**

```python
IDLE_PHASES = [index / 8 for index in range(8)]
SWIM_PHASES = [index / 12 for index in range(12)]
DISCOVER_BLEND = [0.0, 0.08, 0.24, 0.48, 0.76, 1.0, 1.0, 0.88, 0.62, 0.35]
```

Blend only a feathered face ellipse covering normalized bounds `(0.58, 0.08, 0.83, 0.48)`. Apply body bob and pitch after localized blending. Fit every result into a `768x432` transparent canvas with the same subject pivot and at least 12 transparent pixels on every edge; raise `ValueError` if this cannot be satisfied.

- [ ] **Step 5: Render and validate**

Run:

```powershell
python scripts/underwater_v2/render_mermaid.py
python -m unittest discover -s tests/python -p "test_*.py" -v
```

Expected: 30 RGBA frames, three sheets, three contact sheets, three manifests, and all tests PASS.

- [ ] **Step 6: Inspect contact sheets and commit accepted exports**

Reject any missing hair, bow, fingers, fins, sequins, teeth, or matte damage. Keep unkeyed and keyed intermediates under `spriterrific-runs/`.

```powershell
git add scripts/underwater_v2 public/images/underwater-v2/mermaid tests/python
git commit -m "feat: render identity-safe Liliana sprite clips"
```

---

### Task 4: Produce and rig the six interactive objects

**Files:**
- Create: `spriterrific-runs/<object>/reference/anchor-source.png`
- Create: `scripts/underwater_v2/render_objects.py`
- Modify: `tests/python/test_underwater_renderer.py`
- Create: `public/images/underwater-v2/interactives/**`

**Interfaces:**
- Produces: shell 8, fish 10, turtle 10, chest 8, jellyfish 8, and crab 8-frame clips.

- [ ] **Step 1: Generate one anchor per object**

Use built-in image generation once per object. Prompt every anchor as a single cinematic stylized 3D storybook underwater subject matching `background-main.png`, isolated on a flat removable matte, fully visible, no text, no watermark, no cast shadow, and generous padding. Save every unkeyed result under the object's `reference/` directory.

- [ ] **Step 2: Visually approve anchors before animation**

Verify palette, material, lighting direction, complete anatomy/hinges, and absence of baked shadows. Reject anchors that obscure their silhouette or duplicate background scenery.

- [ ] **Step 3: Add failing exact-count tests**

```python
expected = {"pearl-shell": 8, "fish-courier": 10, "sea-turtle": 10,
            "treasure-chest": 8, "jellyfish": 8, "crab": 8}
rendered = render_object_clips(self.object_sources, self.output_dir)
self.assertEqual({name: len(frames) for name, frames in rendered.items()}, expected)
```

- [ ] **Step 4: Verify RED**

Run: `python -m unittest tests.python.test_underwater_renderer.RendererTests.test_object_clip_counts -v`

Expected: FAIL because `render_object_clips` does not exist.

- [ ] **Step 5: Implement deterministic motions**

Use the following normalized phase functions:

```python
loop = lambda index, count: sin((index / count) * tau)
ease = lambda index, count: 0.5 - 0.5 * cos((index / (count - 1)) * pi)
```

- Shell/chest: rotate the masked upper segment from `0` to `-38`/`-52` degrees around a documented hinge.
- Fish/turtle: apply low-amplitude body pitch and masked fin/flipper rotations.
- Jellyfish: scale bell Y by `1 + 0.07 * loop` and wave only the lower 45%.
- Crab: rotate the selected claw segment through `0, 14, 28, 42, 28, 14, 5, 0` degrees.

Store per-object hinge and mask coordinates in `docs/assets/underwater-v2-production.json` so adjustments are reproducible.

- [ ] **Step 6: Render, inspect, and commit**

Run: `python scripts/underwater_v2/render_objects.py && python -m unittest discover -s tests/python -p "test_*.py" -v`

Expected: 52 object frames plus sheets/contact sheets/manifests and all tests PASS.

```powershell
git add docs/assets/underwater-v2-production.json scripts/underwater_v2 public/images/underwater-v2/interactives tests/python
git commit -m "feat: render underwater interactive sprite clips"
```

---

### Task 5: Add the typed catalog and deterministic sprite runtime

**Files:**
- Create: `data/spriteCatalog.ts`
- Create: `lib/spriteRuntime.mjs`
- Create: `tests/sprite-runtime.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `frameAtTime(elapsedMs, fps, frames, loop)`.
- Produces: `sheetPosition(frame, columns, rows)`.
- Produces: typed `SpriteClip` entries with non-square `768x432` frames.

- [ ] **Step 1: Write failing runtime tests**

```js
assert.equal(frameAtTime(500, 12, 12, true), 6);
assert.equal(frameAtTime(5000, 8, 8, false), 7);
assert.deepEqual(sheetPosition(6, 4, 3), { column: 2, row: 1, xPercent: 66.66666666666666, yPercent: 50 });
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/sprite-runtime.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement minimal helpers**

```js
export function frameAtTime(elapsedMs, fps, frames, loop) {
  const raw = Math.floor(Math.max(0, elapsedMs) / (1000 / fps));
  return loop ? raw % frames : Math.min(raw, frames - 1);
}

export function sheetPosition(frame, columns, rows) {
  const column = frame % columns;
  const row = Math.floor(frame / columns);
  return {
    column, row,
    xPercent: columns === 1 ? 0 : column / (columns - 1) * 100,
    yPercent: rows === 1 ? 0 : row / (rows - 1) * 100,
  };
}
```

- [ ] **Step 4: Create the catalog from manifests**

Define `SpriteClip` with `sheet`, `frameWidth: 768`, `frameHeight: 432`, `frames`, `columns`, `rows`, `fps`, and `loop`. Use 4x2 idle, 4x3 swim, 5x2 discover, and grids no wider than five columns for every object.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test tests/sprite-runtime.test.mjs && npm run typecheck`

Expected: PASS.

```powershell
git add data/spriteCatalog.ts lib/spriteRuntime.mjs tests/sprite-runtime.test.mjs package.json
git commit -m "feat: add underwater sprite catalog and runtime"
```

---

### Task 6: Implement synchronized altitude-aware silhouette shadows

**Files:**
- Create: `lib/underwaterProjection.mjs`
- Create: `components/underwater/SpriteActor.tsx`
- Modify: `tests/sprite-runtime.test.mjs`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `mermaidAltitude(y, sceneHeight)` and `projectShadow(input)`.
- Produces: `<SpriteActor clip width shadow />` using the same frame position for subject and shadow.

- [ ] **Step 1: Write failing projection tests**

```js
const near = projectShadow({ x: 500, y: 700, sceneWidth: 1000, sceneHeight: 900, altitude: 0, speed: 0, facing: 1 });
const high = projectShadow({ x: 500, y: 300, sceneWidth: 1000, sceneHeight: 900, altitude: .8, speed: 0, facing: 1 });
assert.ok(near.opacity > high.opacity);
assert.ok(near.blurPx < high.blurPx);
assert.ok(high.groundY > 300);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/sprite-runtime.test.mjs`

Expected: FAIL because projection helpers are absent.

- [ ] **Step 3: Implement projection math**

```js
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (from, to, amount) => from + (to - from) * amount;

export function mermaidAltitude(y, sceneHeight) {
  return clamp((sceneHeight * .78 - y) / (sceneHeight * .55), 0, 1);
}

export function projectShadow({ x, y, sceneWidth, sceneHeight, altitude, speed, facing }) {
  return {
    groundX: x + (sceneWidth * .5 - x) * .05 * altitude,
    groundY: clamp(y + sceneHeight * mix(.07, .23, altitude), sceneHeight * .56, sceneHeight * .93),
    opacity: mix(.36, .08, altitude),
    blurPx: mix(3, 20, altitude),
    scaleX: (1 + clamp(speed / 1400, 0, .22)) * facing,
    scaleY: mix(.28, .12, altitude),
    skewXDeg: facing * mix(-8, -3, altitude),
  };
}
```

- [ ] **Step 4: Implement `SpriteActor`**

Compute one `frameAtTime` value and one `backgroundPosition`. Apply the identical sheet/frame style to the subject, cast-shadow, and optional contact-shadow windows. The shadow frame uses `brightness(0)`, a blue-teal tint, `blur(var(--shadow-blur))`, perspective scale/skew, and `mix-blend-mode: multiply`; it must not use `drop-shadow()` or a pseudo-element ellipse.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test tests/sprite-runtime.test.mjs && npm run typecheck`

Expected: PASS.

```powershell
git add lib/underwaterProjection.mjs components/underwater/SpriteActor.tsx tests/sprite-runtime.test.mjs app/globals.css
git commit -m "feat: add synchronized underwater silhouette shadows"
```

---

### Task 7: Integrate the redesigned cast and PNG background

**Files:**
- Modify: `data/interactiveObjects.ts`
- Modify: `components/underwater/MermaidCharacter.tsx`
- Modify: `components/underwater/InteractiveSeaObject.tsx`
- Modify: `components/underwater/UnderwaterScene.tsx`
- Modify: `components/underwater/AmbientLayers.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `spriteCatalog`, `SpriteActor`, `mermaidAltitude`, and `projectShadow`.
- Produces: accessible six-object scene with idle/swim/discover Liliana state.

- [ ] **Step 1: Add failing integration assertions**

Require `background-main.png`, all seven catalog IDs, `SpriteActor`, and projection helpers. Assert source no longer references `background-main.mp4`, the two-pose mermaid layers, old ambient foreground fish, or generic object-shadow selectors.

- [ ] **Step 2: Verify RED**

Run: `npm test`

Expected: FAIL on obsolete asset references.

- [ ] **Step 3: Replace scene assets and animation state**

Use the approved placements: shell `(16%,78%)`, fish `(20%,45%)`, turtle `(36%,76%)`, chest `(66%,80%)`, jellyfish `(82%,44%)`, crab `(85%,82%)`. Derive Liliana clip as:

```ts
const action = activeDetail ? "discover" : travelSpeed > 1.4 ? "swim" : "idle";
```

Transition discovery back to idle after `frames / fps` seconds. Preserve real buttons, keyboard activation, focus visibility, touch targets, Escape handling, and the details fallback dialog.

- [ ] **Step 4: Replace the background and remove redundant scenery**

Render `/images/underwater/background-main.png` as the sole background image. Keep only subtle lighting/vignette overlays; remove foreground scenery that duplicates the permanent coral, rocks, plants, bubbles, and distant fish.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
npm run typecheck
npm run lint
npm test
```

Expected: all commands exit 0.

```powershell
git add data components/underwater app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: integrate direct-rig underwater scene"
```

---

### Task 8: Perform visual, masking, shadow, and responsive acceptance

**Files:**
- Modify if required: `scripts/underwater_v2/**`
- Modify if required: `public/images/underwater-v2/**`
- Modify if required: `components/underwater/**`
- Modify if required: `app/globals.css`
- Modify: `README.md`

**Interfaces:**
- Produces: final verified scene and exact raw-mask repair instructions.

- [ ] **Step 1: Inspect all 82 frames at original runtime resolution**

Check hair, bow, two lower teeth, absence of upper teeth, fingers, fins, tail, sequins, hinges, claws, legs, and tentacles. Reject crop, transparent holes, yellow fringe, canvas recentering, position pops, and texture changes.

- [ ] **Step 2: Step every subject/shadow pair**

Confirm the visible frame and shadow use the same silhouette. Move Liliana from near-sand to high-water positions and verify opacity decreases, blur and ground offset increase, perspective remains on the seabed, speed stretches the shadow modestly, and facing flips both layers.

- [ ] **Step 3: Verify desktop and mobile flows**

Run `npm run dev`, then test desktop, portrait mobile, and landscape mobile for pointer, drag, tap, keyboard, Escape, fallback dialog, focus visibility, proximity discovery, reduced motion, and protected background composition.

- [ ] **Step 4: Document the operator workflow**

Record approved source paths, archive locations, final asset paths, frame counts, the refunded Spriterrific pilot, and the manual-mask repair path. Never include the API key.

- [ ] **Step 5: Run final gates and commit corrections**

Run:

```powershell
python -m unittest discover -s tests/python -p "test_*.py" -v
npm run typecheck
npm run lint
npm test
```

Expected: all checks pass with no warnings attributable to the underwater-v2 work.

```powershell
git add README.md scripts/underwater_v2 public/images/underwater-v2 data components/underwater app/globals.css tests
git commit -m "fix: complete direct-rig underwater acceptance"
```
