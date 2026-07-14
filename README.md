# Liliana’s First Birthday Invitation

A premium single-page underwater invitation built with Next.js, React, TypeScript, Tailwind CSS, Framer Motion, and the Sites-compatible vinext runtime. Guests guide a baby mermaid through a fixed illustrated scene to uncover six party details.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Use `npm run lint`, `npm run typecheck`, `npm run build`, or `npm test` to verify the project.

## Edit the invitation

All invitation copy lives in `data/eventDetails.ts`. The date, time, venue, and RSVP values are intentionally marked as placeholders until the final information is confirmed.

The six discoveries, labels, assets, percentage positions, and proximity radii live in `data/interactiveObjects.ts`. Adjusting this one configuration file changes both the scene and the accessible all-details dialog.

## Replace the baby face

The site currently falls back to a generated, non-identifiable baby-face placeholder. Add the final tightly cropped face image at exactly:

`public/images/mermaid/baby-face.png`

No component change is required. Use a front-facing PNG with even lighting and very little hair or background around the face. The artwork and mask handle the crop inside the illustrated mermaid.

## Artwork map

- `public/images/underwater/background-main.png` — wide scene background with an open center swim lane
- `public/images/underwater/bubbles-overlay.png` — transparent ambient bubbles
- `public/images/mermaid/` — mermaid body and face layers
- `public/images/sea-elements/` — transparent interactive shells, coral, chest, crab, starfish, plants, and rocks
- `public/images/fish/` — transparent interactive and ambient fish
- `public/og.png` — social-share preview

All illustrated scene assets were made as a coordinated raster set. Keep the same filenames to replace artwork without code changes, or update the relevant asset path in `data/interactiveObjects.ts`.

## Interaction and accessibility

- Pointer movement, touch dragging, and tap-to-swim share the same smoothed movement target.
- Swimming near an illustrated object reveals its detail; selecting it opens the same detail directly.
- Objects keep the center swim lane open and only reveal discovery text on hover, focus, or activation.
- “Open all party details” provides a complete non-game fallback.
- Escape closes an open detail or dialog, and focus stays trapped inside the modal while open.
- Focus rings, button semantics, polite announcements, and 48px-or-larger controls support keyboard and assistive-technology users.
- Reduced-motion preferences remove continuous motion and make mermaid movement immediate.
- Animation pauses while the browser tab is hidden.

No API, database, authentication, or runtime secrets are required.
