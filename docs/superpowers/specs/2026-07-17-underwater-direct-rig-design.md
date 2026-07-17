# Underwater Direct Rig Asset Design

**Status:** Approved in conversation

**Date:** 2026-07-17

## Decision

Replace the Spriterrific production path with deterministic local sprite rendering. The failed Spriterrific pilot was fully refunded, and no provider output is accepted into production. The enhanced user-supplied anchors at `E:/DOWNLOADS/idle.png` and `E:/DOWNLOADS/laugh.png` are the visual authority for Liliana.

Three approaches were considered:

1. Continue Spriterrific video generation. This offers organic motion but risks identity drift, requires most available credits, and currently cannot pass the private reference cleanly through the installed HTTP skill.
2. Generate every animation frame independently. This is fast to prompt but produces the same texture and facial inconsistency already rejected by the user.
3. Preserve accepted pixels and animate them through local masking, mesh deformation, and procedural rendering. This is the selected approach because it protects identity, teeth, costume texture, and exact framing while still producing smooth multi-frame output.

## Goals

- Replace every foreground asset used by the underwater scene.
- Preserve Liliana's enhanced face and outfit pixels without generative repainting.
- Produce 8-frame idle, 12-frame swim, and 10-frame discovery clips.
- Preserve every unmasked source and every intermediate derivative.
- Match the cinematic stylized 3D storybook background.
- Render realistic silhouette-derived shadows that respond to altitude and movement.

## Liliana Source and Motion Architecture

The active unmasked anchors are stored in:

- `spriterrific-runs/mermaid-smile/reference/anchor-source.png`
- `spriterrific-runs/mermaid-laugh/reference/anchor-source.png`

Earlier unmasked anchors remain beside them as `anchor-source-before-user-enhancement.png`. Nothing in the renderer overwrites these sources.

Yellow removal creates lossless RGBA derivatives. Matte cleanup uses border-color estimation, soft alpha thresholds, edge despill limited to yellow contamination, and a validation pass for complete hair, bow tips, fingers, fins, sequins, and tail edges. The raw yellow files remain the repair source.

Motion is rendered from the accepted RGBA anchors:

- **Idle, 8 frames:** small vertical buoyancy, subtle rotation, breathing-scale change, and restrained tail-tip wave. The face stays on the enhanced idle anchor.
- **Swim, 12 frames:** a continuous sinusoidal displacement field whose amplitude grows from the torso toward the fluke, plus modest body pitch and vertical travel. The head and face use a protected low-deformation region.
- **Discover, 10 frames:** ease from the idle anchor into the enhanced laugh anchor, lift and settle, and a synchronized tail flourish. Expression transition uses a localized feathered face blend instead of whole-image regeneration.

All frames use a fixed canvas, stable pivot, and preserved bounds. A frame fails if anatomy is clipped, fine parts disappear, the face changes texture, the two lower teeth are lost, upper teeth appear, or costume details drift.

## Interactive Object Production

The six retained party-detail roles are pearl shell, fish courier, sea turtle, treasure chest, jellyfish, and crab. ChatGPT image generation may create one high-resolution static anchor per object on a removable matte. It must not generate animation frames independently.

Each accepted object anchor is animated deterministically:

- Shell and chest: hinged open/close motion with masked lid segments and restrained internal light.
- Fish and turtle: body translation plus fin/flipper deformation and small pitch changes.
- Jellyfish: vertical pulse, bell squash/stretch, and lower-tentacle wave.
- Crab: body settle with a segmented claw wave.

Object anchors and every unkeyed generation are archived before masking. Runtime frames are derived from the accepted anchor only.

## Shadow Design

No ellipse, generic blob, CSS drop shadow, or unrelated painted shape is allowed. Every shadow begins with the exact active frame alpha.

The renderer converts frame alpha into a blue-teal multiply silhouette, applies floor-perspective compression and skew, then applies physically motivated blur and opacity. Grounded objects also receive a tight contact-occlusion derivative clipped to their lowest real contact region.

Liliana's shadow is calculated per frame from scene position, velocity, perspective depth, facing, and virtual altitude:

- Near sand: darker, sharper, smaller offset, and more detailed.
- High water: lighter, softer, wider, and projected farther toward the seabed.
- Fast movement: slightly lengthened along travel direction.
- Turning: subject and projected silhouette flip together.

## Archive and Runtime Layout

Production sources stay under `spriterrific-runs/` for compatibility with the approved archive contract, even though no provider generation is used:

```text
spriterrific-runs/<asset>/
  reference/
  raw-unkeyed/
  selected-unkeyed/
  keyed/
  manual-fixes/
  shadows/
  final/
```

Approved runtime exports are copied to:

```text
public/images/underwater-v2/
  mermaid/{idle,swim,discover}/
  interactives/<asset>/<clip>/
```

Each clip contains individual RGBA frames, a spritesheet, a preview, a manifest, and synchronized shadow frames or a shadow manifest.

## Renderer and Runtime Boundaries

- `scripts/underwater-v2/` contains deterministic Python/Pillow render tools.
- Pure color-key, deformation, packing, and manifest functions are testable without browser code.
- `data/spriteCatalog.ts` is the only runtime asset catalog.
- `SpriteActor` advances one frame index shared by subject and shadow.
- `UnderwaterScene` owns position, velocity, altitude, facing, and clip transitions.
- Interactive controls preserve button semantics, keyboard activation, touch targets, focus visibility, and the fallback details dialog.

## Error Handling and Validation

- Mask failures are repaired from the retained yellow source; the raw source is never regenerated.
- Frame-bound overflow fails the renderer instead of silently cropping.
- Missing frame counts, mismatched dimensions, or incomplete manifests fail automated contract tests.
- Alpha coverage and transparent-corner checks reject broken masking.
- A contact sheet is generated for every clip and inspected before promotion.
- Any identity or texture drift rejects the frame set; no automated acceptance overrides visual review.

## Acceptance Criteria

1. The application references `background-main.png` and only approved `underwater-v2` foreground assets.
2. Liliana matches the enhanced idle and laugh anchors, including exactly two lower teeth and no upper teeth.
3. Lavender bow, magenta sequined shell top, emerald scaled tail, hair, hands, and fins remain complete.
4. No pearl necklace, loose strand, or handheld beads appear.
5. Idle has 8 frames, swim has 12, and discovery has 10; no two-frame alternation remains.
6. All six interactives use multi-frame animation and retain accessible discovery behavior.
7. Raw unmasked sources and intermediate keyed/manual-fix files are preserved.
8. Shadows are derived from matching frame silhouettes and remain synchronized.
9. Liliana's shadow responds continuously to altitude, position, velocity, facing, and perspective.
10. Desktop, portrait mobile, and landscape mobile preserve the illuminated center and coral composition.
11. Type checking, linting, build, asset-contract tests, renderer tests, and rendered-HTML tests pass.

## Non-Goals

- Do not modify the background.
- Do not use Spriterrific outputs in production.
- Do not repaint or generatively edit Liliana's accepted anchors.
- Do not independently generate every animation frame.
- Do not discard raw yellow-background assets.
