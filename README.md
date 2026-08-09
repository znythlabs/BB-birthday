# Liliana’s First Birthday Invitation

A single-screen underwater invitation built with Next.js, React, TypeScript, Framer Motion, and the vinext/Vite runtime. Guests guide Liliana through a cinematic stylized 3D storybook reef and discover six party details.

## Run locally

Requires Node.js 22.13 or newer and Python 3 with Pillow and NumPy when rebuilding artwork.

```bash
npm install
npm run dev
```

Use `npm run lint`, `npm run typecheck`, `npm run build`, or `npm test` to verify the application.

## Edit the invitation

Invitation copy lives in `data/eventDetails.ts`. The date, time, venue, and RSVP values remain placeholders until the final information is confirmed.

The six discoveries, labels, WebM assets, percentage positions, proximity radii, and grounded/floating behavior live in `data/seaObjects.ts`.

## Artwork map

- `public/images/underwater/background-main.png` — immutable 2048×1152 scene background
- `public/images/mermaid/mermaid-transparent.webm` — Liliana's transparent animated character
- `public/images/underwater-v2/interactives/` — transparent WebM sea-object animations and dedicated shadow images
- `spriterrific-runs/` — raw anchors and preserved artwork sources
- `public/fonts/` — locally bundled Bodoni Moda headline fonts
- `public/og.png` — social-share preview

The old video background, sprite sheets, ambient foreground fish, and legacy sea-element cutouts are no longer used by the scene.

## Interaction and accessibility

- Pointer movement, touch dragging, and tap-to-swim share the same smoothed target.
- Liliana's transparent WebM loops inline; reduced-motion preferences pause it.
- Swimming near an object reveals its detail; selecting a real button opens the same detail directly.
- “Open all party details” provides a complete non-game fallback.
- Escape closes an open detail or dialog, and focus remains inside the modal while it is open.
- Focus rings, button semantics, polite announcements, and 48px-or-larger controls support keyboard and assistive-technology users.
- Reduced-motion preferences pause mermaid playback and make movement immediate.
- Sea-object WebM actors retain dedicated shadows where needed.

## Artwork preservation

Approved Liliana sources:

- original enhanced idle: `E:/DOWNLOADS/idle.png`
- original enhanced laugh: `E:/DOWNLOADS/laugh.png`
- production idle anchor: `spriterrific-runs/mermaid-smile/reference/anchor-source.png`
- production laugh anchor: `spriterrific-runs/mermaid-laugh/reference/anchor-source.png`

Liliana must retain her lavender glitter bow, magenta sequined shell top, emerald scaled tail, hair, hands, and complete fins. Do not add a pearl necklace, loose pearl strand, or handheld beads. Do not generatively edit her accepted frames.

The six accepted object anchors remain stored at `spriterrific-runs/<object-id>/reference/anchor-source.png`.

### Raw preservation and manual mask repair

Never overwrite or delete a raw source. Each render keeps removable-matte copies in:

- Liliana: `spriterrific-runs/mermaid-direct-rig-v3/raw-unkeyed/` and `spriterrific-runs/mermaid-direct-rig-v3/selected-unkeyed/`
- objects: `spriterrific-runs/object-rig-v3/<object-id>/raw-unkeyed/` and `spriterrific-runs/object-rig-v3/<object-id>/selected-unkeyed/` (the previous v2 rig remains preserved)
- accepted keyed derivatives: the matching `keyed/` directories
- hand repairs: the matching `manual-fixes/<clip>/frame-###.png` directory

If automatic masking removes hair, fingers, fins, claws, legs, hinges, or tentacles, open the corresponding `selected-unkeyed` frame in a layer-capable editor. Remove only the flat matte, keep the canvas at exactly 768×432, preserve the subject’s position and every semi-transparent edge, and save the corrected RGBA PNG under `manual-fixes/<clip>/` with the same `frame-###.png` filename. Apply and repack it with:

```bash
python scripts/underwater_v2/repack.py <public-clip-directory> --replacement <manual-fix-frame.png>
```

The command rejects the wrong color mode, canvas size, filename, or frame index before replacing the public frame, then rebuilds that clip’s runtime sheet and contact sheet. Rerun the full verification commands below. Keep both the unmasked original and the rejected automatic mask.

### Spriterrific status

Spriterrific was evaluated as an optional workflow, but its pilot job failed before producing an accepted asset and was fully refunded. It is not a build or production dependency. The project-local skill remains reference material only; no Spriterrific API key belongs in source control or documentation.

## Final verification

```bash
python -m unittest discover -s tests/python -p "test_*.py" -v
npm run typecheck
npm run lint
npm test
```

Before replacing an accepted export, inspect the contact sheet and the individual full-resolution frames for cropped anatomy, transparent holes, color fringe, texture changes, recentering, and frame-to-frame pops.

No API, database, authentication, or runtime secret is required by the invitation itself.
