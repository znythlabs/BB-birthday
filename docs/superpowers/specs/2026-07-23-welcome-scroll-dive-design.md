# Welcome-to-Underwater Scroll Dive Design

**Date:** 2026-07-23  
**Status:** Approved for implementation planning  
**Scope:** Add a video welcome screen, a reversible scroll-scrub dive, and a refined compact title to the existing underwater invitation.

## Goals

- Open on a full-screen welcome scene backed by `public/images/underwater/island.mp4`.
- Show only `Liliana’s 1st Birthday` and the existing welcome message, `Come swim, sparkle, and celebrate with us!`, on the welcome screen.
- Scrub `public/images/underwater/transition.mp4` forward while scrolling down and backward while scrolling up.
- Use GSAP and ScrollTrigger for the pinned scroll timeline and Lenis for smooth scrolling.
- Join the transition’s final underwater frame to the existing `public/images/underwater/background-main.mp4` scene.
- Keep every sea object, fish, mermaid, title, control, and interactive overlay absent from the transition.
- Keep the underwater title, but make it smaller and replace the current glass-card treatment with artwork inspired by `public/og.png`.

## Non-goals

- Do not redesign the existing underwater interactions, object motion, dialogue cards, music controls, or party-detail content.
- Do not change the source `island.mp4`, `transition.mp4`, or `background-main.mp4` files.
- Do not display date, time, venue, RSVP, or other logistical details on the welcome screen.
- Do not add sea-life decoration to the welcome or transition sections.

## Experience Structure

The page becomes one vertical journey with three isolated sections:

1. **Welcome scene:** one viewport high, with the island video looping behind centered invitation copy and a restrained scroll cue.
2. **Dive transition:** a tall scroll corridor whose full-screen video is pinned by ScrollTrigger. Scroll progress controls the video time in both directions.
3. **Underwater scene:** the existing interactive scene begins only after the transition reaches its final frame.

The first frame of `transition.mp4` visually matches the island scene, and its final frame visually matches the first frame of `background-main.mp4`. The section boundaries therefore use direct visual handoffs rather than decorative overlays or unrelated crossfades.

## Component Architecture

### `InvitationJourney`

A client component becomes the page-level orchestrator. It owns:

- Lenis creation and cleanup.
- GSAP ticker integration.
- ScrollTrigger registration, refresh, and cleanup.
- The three-section document order.
- Reduced-motion detection.

`app/page.tsx` renders this component instead of rendering `UnderwaterScene` directly.

### `WelcomeScene`

This component renders:

- A muted, looping, autoplaying, inline `island.mp4` background video.
- A light protective gradient for text contrast without obscuring the family or island.
- An accessible HTML heading containing exactly `Liliana’s 1st Birthday`.
- The welcome message from `eventDetails.invitationMessage`.
- A small `Scroll to dive` cue near the safe-area-aware bottom edge.

The welcome copy remains readable HTML rather than being baked into the background video.

### `ScrollDiveTransition`

This component renders a tall trigger element with one sticky/pinned viewport child containing only the transition video. No underwater component or decorative layer is nested inside it.

It waits for `loadedmetadata`, pauses the video, and creates a GSAP tween from `currentTime: 0` to the usable end of the clip with `ease: "none"`. ScrollTrigger supplies:

- `start: "top top"`
- a scroll distance of `350vh`
- `pin: true`
- `scrub: 0.15`
- `anticipatePin: 1`
- `invalidateOnRefresh: true`

The mapping is linear: progress `0` equals the first frame, progress `0.5` equals the midpoint, and progress `1` equals the final usable frame. Because ScrollTrigger progress is reversible, upward scrolling rewinds the same video timeline.

### `UnderwaterScene`

The existing scene remains the third sibling section. Its background, fish schools, ambient layers, mermaid, interactive objects, bubbles, music control, and all-details control are not rendered within the transition container. This structural separation is the primary guarantee that sea objects cannot appear during the dive.

The underwater scene remains one viewport high and keeps its current interaction model.

## Lenis and ScrollTrigger Integration

Lenis runs in manual animation-frame mode so GSAP owns the shared clock:

- Lenis emits scroll updates to `ScrollTrigger.update`.
- GSAP’s ticker calls `lenis.raf(time * 1000)`.
- GSAP lag smoothing is disabled for consistent video progress.
- ScrollTrigger refreshes after video metadata and layout-critical assets are ready.

The integration uses window scrolling; it does not create a transformed scroll container or require `scrollerProxy`.

Unmount cleanup must revert the scoped GSAP context, kill the transition ScrollTrigger, remove the ticker callback, detach Lenis listeners, and destroy the Lenis instance.

## Scrub-Optimized Video Asset

The supplied transition clip is 3840×2160 at 60 fps and has keyframes roughly 2.5 seconds apart. Direct browser seeking may therefore stall or jump, especially on mobile.

Implementation will preserve the source and create `public/images/underwater/transition-scrub.mp4` with:

- The exact source visuals and duration.
- 1920×1080, 30 fps output suitable for full-viewport web playback.
- H.264 encoding with a fixed keyframe interval no longer than 0.2 seconds for responsive seeking.
- A fast-start MP4 container.
- No audio track, because the transition video is decorative and scroll-controlled.

The scrub component prefers the optimized derivative. The original remains the visual source of truth and is not overwritten.

## Underwater Title Artwork

The current glass title card is replaced by a compact transparent title asset inspired by the lettering in `public/og.png`.

The artwork must contain exactly:

> Liliana’s First Birthday

Visual direction:

- Pearl-white lettering with shell-pink and lavender iridescence.
- An elegant script treatment for `Liliana’s` paired with a refined serif for `First Birthday`.
- Fine highlight, bevel, and soft ocean-depth shadow rather than a heavy panel.
- At most one restrained shell, pearl, or flourish motif.
- Transparent background with clean edges.
- No mermaid, characters, coral scene, card, or large decorative frame.

The generated asset is displayed at a responsive width of `clamp(220px, 30vw, 400px)` near the top center. The exact title remains present as visually hidden HTML so the page heading is accessible even if the artwork is decorative.

The asset is not accepted until spelling, punctuation, transparency, cropping, and readability are visually verified against `og.png`.

## Layer and Visibility Contract

During the entire pinned transition:

- Only the transition video is visible.
- The welcome copy has already left the viewport.
- The underwater scene remains after the pinned trigger in normal document flow.
- `.sea-object-layer`, `BackgroundFishSchools`, `AmbientLayers`, `MermaidCharacter`, title artwork, music controls, detail controls, and message bubbles cannot overlap the transition.
- Transition video layers do not accept pointer input.

At the bottom boundary, the pinned video releases on its final frame and the underwater scene replaces it naturally through scrolling. Reversing direction restores the pinned final frame and then rewinds toward the island.

## Responsive Behavior

- Videos use full-bleed `object-fit: cover` with centered framing.
- Viewport sizing uses dynamic viewport units with safe fallbacks.
- Welcome text is clamped for phone, tablet, and desktop widths and stays clear of the family in the background composition.
- The scroll cue remains above bottom safe-area insets.
- The same ScrollTrigger progress mapping is used on wheel, touch, trackpad, and keyboard scrolling.
- Lenis must not prevent native focus navigation or make touch scrolling feel trapped.

## Reduced Motion

For `prefers-reduced-motion: reduce`:

- Do not initialize Lenis smoothing.
- Do not pin or continuously scrub the transition video.
- Use normal document scrolling and a short static visual handoff from the island to the underwater end frame.
- Keep all underwater controls and direct interactions functional.

## Failure Handling

- Until transition metadata is available, keep the transition video paused at its first frame.
- If optimized video loading fails, fall back to the original transition source.
- If GSAP initialization cannot run, the three sections remain readable in normal document order.
- Video backgrounds remain muted and decorative, with no accessibility dependence on motion or audio.

## Verification

### Automated checks

- Type-check the affected React and TypeScript code.
- Run the project’s targeted unit and rendered-HTML tests.
- Add focused coverage for progress-to-video-time clamping and required section/video ordering where it provides stable value.
- Run the production build to catch client/server boundary and asset-reference failures.

### Browser checks

- Confirm the welcome screen shows only the title, welcome message, and scroll cue.
- Confirm transition progress reaches the first, midpoint, and final visual states.
- Scroll downward and upward repeatedly and verify the same video scrubs forward and backward without autoplaying independently.
- Confirm no mermaid, sea object, fish school, bubble, title, or control appears at any transition progress.
- Confirm the final transition frame joins the underwater background without a flash or unrelated frame.
- Confirm the compact title artwork is correctly spelled, legible, unobtrusive, and visually consistent with `og.png`.
- Check desktop and mobile viewport behavior, including touch scrolling and orientation changes.
- Check reduced-motion behavior.

## Acceptance Criteria

- The page opens on the looping island welcome scene.
- The welcome contains only Liliana’s title, the approved welcome message, and the scroll cue.
- Lenis provides smooth scrolling under normal motion preferences.
- GSAP ScrollTrigger pins and scrubs the transition video in direct response to scrolling.
- Scrolling upward visibly reverses the transition.
- No underwater object or interface layer appears during the transition.
- The transition hands off cleanly to the existing interactive underwater scene.
- The underwater title is smaller and uses verified transparent artwork inspired by `og.png`.
- Relevant automated checks and browser verification pass without overwriting unrelated worktree changes.
