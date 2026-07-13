# Liliana’s First Birthday Invitation

A single-page, interactive under-the-sea invitation built with Next.js, React, TypeScript, Tailwind CSS, and the Sites-compatible vinext runtime. Guests can guide the baby mermaid with a mouse, touch, tap, or drag to discover six party details.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server. Use `npm run lint`, `npm run typecheck`, `npm run build`, or `npm test` to verify the project.

## Edit the invitation

All invitation copy lives in [`data/eventDetails.ts`](data/eventDetails.ts). The date, time, venue, and RSVP values are intentionally marked as placeholders until the final information is confirmed.

The six discoverable objects, their labels, percentage positions, and proximity radii live in [`data/interactiveObjects.ts`](data/interactiveObjects.ts).

## Replace the baby face

Add the final, tightly cropped face image at exactly:

`public/images/mermaid/baby-face.png`

That one file automatically covers the illustrated placeholder face; no component changes are required. A square PNG with a transparent background works best. Keep the face centered with a little space around the forehead and chin.

## Replace the background

Replace [`public/images/background/underwater.png`](public/images/background/underwater.png) with another image using the same filename. A wide 16:9 image with a calm center and detail around the edges works best.

The matching social-share preview lives at `public/og.png`. Replace that file with another wide image if the invitation artwork changes.

## Interaction and accessibility

- Desktop pointer movement, touch dragging, and tap-to-swim all use the same smoothed movement target.
- Swimming near an object reveals its detail; selecting any object button opens it directly.
- “Open party details” provides a complete non-game fallback.
- Escape closes an open detail or the details dialog.
- Visible focus rings, real button semantics, polite announcements, and 44px-or-larger controls support keyboard and assistive-technology users.
- Reduced-motion preferences stop continuous decorative animation and make mermaid movement immediate.
- Animation work pauses while the browser tab is hidden.

## Project map

- `app/page.tsx` — page entry
- `app/globals.css` — visual system, responsive layout, and animation
- `components/underwater/` — scene, character, discoverable objects, popup, ambient layers, and details dialog
- `data/` — invitation content and object configuration
- `lib/distance.ts` — proximity math

No API, database, authentication, or runtime secrets are required.
