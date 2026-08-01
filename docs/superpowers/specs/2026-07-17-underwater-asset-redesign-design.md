# Underwater Asset Redesign

**Status:** Superseded by `2026-07-17-underwater-direct-rig-design.md`

**Date:** 2026-07-17

**Production workflow:** Spriterrific reference anchors, video-derived motion, frame curation, chroma cleanup, and runtime export

## Goal

Replace every foreground character, creature, prop, and decorative asset currently used by the invitation with a cohesive high-quality set designed around `public/images/underwater/background-main.png`.

The new background is the visual authority for composition, lighting, color, depth, and rendering quality. Existing foreground artwork and the current two-pose mermaid cutouts must not be reused in the final scene.

## Source Material

- Scene reference: `public/images/underwater/background-main.png`
- Liliana laughing expression: `E:/DOWNLOADS/DSC_8280.jpg`
- Liliana gentle-smile expression: `E:/DOWNLOADS/DSC_8227.jpg`

The photographs are identity and outfit references. They are not assets to cut apart and place directly over the background.

## Visual Direction

The background is a cinematic stylized 3D storybook environment rather than a photograph. New assets must match its rounded sculpted forms, saturated turquoise water, coral-pink and lavender reef accents, smooth high-quality materials, overhead cyan light, soft blue underwater fill, and bright sand caustics.

Liliana must remain recognizably the same baby in both source photographs. Preserve her facial proportions, eyes, cheeks, smile, hair, pigtails, lavender glitter bow, magenta sequined shell top, and emerald scaled mermaid tail. Render her as a polished identity-preserving 3D storybook character so she belongs in the scene without becoming a generic cartoon.

Do not include the pearl necklace, loose pearl strand, or handheld beads from the photographs.

## Redesigned Cast and Content Mapping

The experience retains six discoverable party-detail roles while redesigning their visual forms:

| Detail | New subject | Primary motion |
| --- | --- | --- |
| Celebrant | Luminous pearl shell | Open and reveal |
| Invitation message | Turquoise-and-lavender fish courier | Swim and pause |
| RSVP | Friendly sea turtle | Swim and welcoming nod |
| Venue | Ornate sunken treasure chest | Open with restrained inner glow |
| Time | Translucent lavender jellyfish | Gentle pulse and tentacle drift |
| Date | Coral-pink crab | Small wave and settle |

Liliana is the central controllable character. Her gentle smile is the normal swimming and idle expression. Her open-mouth laugh appears during discovery reactions.

The background already contains the permanent coral, plants, rocks, sand, bubbles, and distant fish. Redundant foreground reef-decoration assets will be removed from scene usage rather than replaced with overlays that obscure the new background.

## Composition

Keep the illuminated central water and sandy path as Liliana's primary swim lane. Interactive subjects begin in these responsive zones:

- Pearl shell: lower-left sand edge.
- Fish courier: mid-left open water beside, not over, the brightest center.
- Sea turtle: lower-middle-left transition between reef and sand.
- Treasure chest: lower-middle-right sand edge.
- Jellyfish: mid-right open water above the reef shelf.
- Crab: lower-right sand and reef boundary.

Positions use responsive percentages and may be adjusted during visual verification to protect the background's coral formations, title-safe area, and mobile safe zones. All six details remain reachable through direct pointer/touch activation and the accessible fallback dialog.

## Spriterrific Production Workflow

1. Create high-fidelity reference anchors for Liliana and each creature or prop. Use `preserve-reference-v1` for Liliana and any accepted subject anchor whose exact appearance must survive later actions.
2. Keep pixel snapping disabled. The target is high-fidelity mixel/3D storybook rendering, not a recoverable low-bit pixel grid.
3. Generate each animated action through Spriterrific's hosted video workflow. Use standard motion families where suitable and custom action labels with the nearest baseline for `swim`, `discover`, `open`, `pulse`, `nod`, and `wave`.
4. Retain provider video, dense extracted frames, contact sheets, run metadata, costs, warnings, and engine version.
5. Use the Spriterrific frame picker to select coherent motion and loop timing. Repick frames at zero generation cost when the motion is good but automatic frame selection is poor.
6. Process selected frames with preserve-canvas behavior so subjects do not shift, crop, or recenter between frames.
7. Apply chroma removal, soft matte cleanup, edge despill, and manual cleanup as separate non-destructive stages.
8. Finalize spritesheets, GIF previews, manifests, and synchronized shadow frames only after visual and automated quality gates pass.

Before every hosted generation, check the available Spriterrific balance, report the expected debit, and never hardcode `SPRITERRIFIC_API_KEY`. Failed individual actions are retried as action jobs against an accepted reference anchor instead of regenerating the whole character.

## Multi-Frame Animation Contract

| Subject/action | Selected-frame target | Playback intent |
| --- | ---: | --- |
| Liliana idle/hover | 8 or more | Closed, gentle loop |
| Liliana swim | 10-12 | Continuous tail, torso, arm, hair, and bow motion |
| Liliana discover/laugh | 8-12 | Gentle smile to laughing expression and settle |
| Fish courier swim/pause | 8-10 | Readable locomotion loop |
| Sea turtle swim/nod | 8-10 | Slow welcoming loop |
| Jellyfish pulse | 8 | Soft buoyant loop |
| Crab wave | 8 | Wave and return to rest |
| Pearl shell open | 8 | Closed-to-open interaction |
| Treasure chest open | 8 | Closed-to-open interaction |

The exact selected count may follow Spriterrific's supported action recommendations, but no final animated subject may fall back to a two-image alternation. Frame timing is tuned per action. Every loop is checked for duplicated frames, abrupt silhouette changes, pose discontinuities, and visible canvas recentering.

## Non-Destructive Masking and Archive

Automated masking success is not acceptance. No source or intermediate file may be overwritten or discarded.

Each run is stored under `spriterrific-runs/<asset-name>-<job-suffix>/`:

```text
reference/
raw-unkeyed/
  provider-video/
  dense-frames/
  contact-sheets/
selected-unkeyed/
keyed/
manual-fixes/
shadows/
final/
job.json
```

`raw-unkeyed` and `selected-unkeyed` are required deliverables so the user can repair masks without regeneration. Raw provider artifacts remain immutable. Manual fixes create new sibling files and record their source frame.

Every selected frame must be inspected at full resolution. Reject frames with any of these defects:

- Hair, bow tips, fingers, hands, fins, tail edges, sequins, tentacles, claws, or shell contours removed.
- Transparent holes inside opaque anatomy or clothing.
- Matte-color fringe, aggressive despill, or lost reflective detail.
- Subject or shadow touching the canvas boundary.
- Body parts cropped, regenerated, duplicated, or materially inconsistent with adjacent frames.
- Liliana's facial identity or outfit drifting from the approved anchors.

The least-conflicting saturated matte is selected per subject after a small anchor test. Chroma selection must account for Liliana's emerald tail and magenta top rather than assuming green or magenta is safe.

## Realistic Shadow System

Shadows are not generic ellipses, CSS drop shadows, or decorative blobs. Every animated frame receives a synchronized shadow frame derived from that frame's complete alpha silhouette.

### Grounded objects

The shell, chest, and crab use two components:

- Tight ambient-contact occlusion at real contact points.
- A perspective-projected cast shadow that preserves recognizable shell, lid, claw, and leg geometry.

### Floating objects

The fish, turtle, and jellyfish use softer seabed projections. Apparent height controls shadow opacity, blur, scale, and offset. The projection follows the background's overhead, slightly rear-centered light and is tinted blue-teal rather than neutral gray or black.

### Liliana's dynamic shadow

Liliana's movement state tracks screen position, facing, velocity, animation frame, perspective depth, and virtual altitude above the seabed. The shadow updates on every animation frame:

- Near the sand: darker, sharper, detailed, and close beneath her.
- Higher in the water: lighter, wider, softer, and farther from her projected ground position.
- During fast swimming: subtly stretched and softened in the travel direction.
- When turning: flipped with the body.
- During tail strokes and reactions: synchronized to the matching Spriterrific frame.
- Toward the distant center: perspective-scaled with the scene floor and vanishing point.

The projected shadow attenuates sand caustics using a restrained underwater multiply treatment. It must feel embedded in the illuminated seabed, not painted on top of the page. Reduced-motion mode simplifies character travel but preserves altitude-based shadow response.

## Runtime Asset Layout

Accepted project assets are copied from the run archive into a new versioned tree before code references change:

```text
public/images/underwater-v2/
  mermaid/
    anchors/
    idle/
    swim/
    discover/
  interactives/
    pearl-shell/
    fish-courier/
    sea-turtle/
    treasure-chest/
    jellyfish/
    crab/
```

Each animation directory contains a spritesheet, preview, manifest, and matching shadow spritesheet or shadow-frame manifest. Existing assets remain untouched until the new set passes integration verification; the application then stops referencing them.

## Integration Architecture

- Replace the two-layer mermaid implementation with a manifest-driven sprite animator.
- Keep one animation controller responsible for current action, facing, frame index, FPS, and loop/transition behavior.
- Keep a separate shadow renderer synchronized from the same frame index and movement state.
- Give each interactive object its own manifest-driven animation state: idle, nearby, active, and settling.
- Preserve real button semantics, keyboard activation, focus visibility, touch targets, and the party-details fallback dialog.
- Pause animation while the document is hidden and reduce continuous movement under `prefers-reduced-motion`.

## Failure Handling

- A partial Spriterrific job is usable only for successful steps; report failed steps and refunded credits.
- If motion is correct but timing is poor, repick frames before regenerating.
- If one action is defective, retry that action against the accepted anchor.
- If masking is defective, repair from `selected-unkeyed`; never regenerate solely because the keyed copy is damaged.
- If identity or outfit consistency fails, reject the anchor or action before integration.
- If a shadow fails perspective or silhouette review, regenerate the shadow derivative without regenerating the subject.

## Acceptance Criteria

1. Every currently used foreground asset is replaced in application usage by an approved `underwater-v2` asset or intentionally removed because its scenery already exists in the background.
2. Liliana is recognizably the baby in both supplied photographs and wears the same lavender bow, magenta shell top, and emerald mermaid tail.
3. No pearl necklace, pearl strand, or handheld beads appear.
4. Liliana uses a gentle-smile idle state and a laughing discovery state connected by multi-frame motion.
5. No final animation uses a two-frame alternation.
6. All selected unkeyed frames and original provider artifacts are retained.
7. No approved alpha frame has cropped anatomy, missing fine parts, holes, or unacceptable chroma fringe.
8. Every animated subject has a synchronized silhouette-derived shadow sequence.
9. Liliana's shadow responds continuously to movement, facing, perspective depth, and altitude above the seabed.
10. Six party-detail objects remain discoverable by pointer, touch, keyboard, and the accessible fallback.
11. The composition preserves the background's illuminated center, coral formations, and responsive safe areas.
12. Desktop, portrait mobile, and landscape mobile verification show coherent scale, placement, animation, masking, and shadows.

## Non-Goals

- Do not regenerate or modify the new background.
- Do not convert the scene to strict pixel art.
- Do not preserve the current two-pose mermaid layers.
- Do not bake interactive objects permanently into the background.
- Do not delete raw Spriterrific artifacts after final export.
