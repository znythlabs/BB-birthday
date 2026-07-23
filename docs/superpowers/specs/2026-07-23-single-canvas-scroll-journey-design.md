# Single-Canvas Scroll Journey Design

**Date:** 2026-07-23  
**Status:** Approved direction, written-spec review pending

## Goal

Make the island welcome, dive transition, and underwater scene feel like one
continuous cinematic section. Scrolling must never reveal a second copy of the
island frame as a separate section.

## Approved experience

The first viewport is one pinned media stage:

1. `island.mp4` plays as the initial full-bleed background.
2. The welcome title, message, and scroll cue sit above that background.
3. The first downward scroll immediately begins the dive in the same viewport.
4. The welcome copy fades during the first 10% of scroll progress.
5. `transition-scrub.mp4` replaces the island background in place, starting
   from its matching first frame.
6. Scroll progress drives the transition video forward; upward scrolling drives
   the same frames backward.
7. At the last transition frame, the pin releases directly into
   `UnderwaterScene`, whose background matches the transition ending.

No sea object, mermaid, fish school, title, button, bubble, or music control may
paint above the pinned media stage.

## Approaches considered

### A. One pinned two-video media stack — selected

Stack the looping island video and paused transition video inside one pinned
viewport. Crossfade between them over the first few percent of scroll progress,
fade the copy over the first 10%, and drive the transition playhead from the
same ScrollTrigger.

This removes the duplicated frame, keeps the supplied assets unchanged, and
allows the motion timing to be tuned without re-rendering video.

### B. One newly composited island-plus-transition video — rejected

Render the island hold and dive into a new combined file. This can be visually
continuous, but it increases asset size, duplicates supplied footage, and makes
the welcome hold duration part of the video instead of the scroll interaction.

### C. Overlap separate welcome and transition sections — rejected

Keep both sections and visually overlap them with sticky positioning. This
retains two scroll/layout boundaries and can still expose the repeated first
frame or stacking seams.

## Component architecture

### `WelcomeDiveSequence`

Replace the sibling `WelcomeScene` and `ScrollDiveTransition` presentation with
one component responsible for:

- the pinned viewport and ScrollTrigger lifecycle;
- the looping island background;
- the paused transition background;
- welcome-copy opacity and visibility;
- scroll-progress-to-video-time mapping;
- cleanup on unmount and media-query changes.

The component must not import or render underwater scene actors.

### `InvitationJourney`

Render exactly:

1. `WelcomeDiveSequence`
2. `UnderwaterScene`

Lenis remains owned by `InvitationJourney`. Under reduced motion, Lenis is not
created.

### `UnderwaterScene`

Keep its current content and compact title unchanged. It remains a normal-flow
sibling after the unified pinned sequence so ScrollTrigger pin spacing pushes
it below the entire dive distance.

## Scroll and media behavior

Use one GSAP ScrollTrigger:

- trigger: the unified media-stage section;
- start: `top top`;
- end: `+=350vh`;
- pin: the media-stage viewport;
- invalidate on refresh;
- no eased GSAP tween of the video `currentTime`.

For each ScrollTrigger update:

1. Clamp progress to `0..1`.
2. Map it to a seek-safe time in `transition-scrub.mp4`.
3. Coalesce repeated updates into one `requestAnimationFrame`.
4. Seek only when the requested time differs materially from the current time.
5. Keep the transition video paused at all times.

This separates responsibilities:

- Lenis smooths document scrolling.
- ScrollTrigger measures and pins.
- The requestAnimationFrame-coalesced playhead seeks the video once per rendered
  frame, avoiding the lag and repeated seeks caused by an eased `currentTime`
  tween.

The transition layer begins visually replacing the island within the first 3%
of progress. Because both assets share the same island starting composition,
the crossfade must not expose a flash or repeated section.

## Copy motion

The title, message, and scroll cue remain fully visible at progress `0`.

From progress `0` to `0.10`:

- opacity moves from `1` to `0`;
- the copy drifts upward by no more than 18px;
- pointer events are disabled as soon as the sequence starts.

After 10%, the copy remains hidden until the user reverses back toward the
island.

## Layout and stacking

- The media stage fills `100svh` with `100vh` fallback.
- Both videos use `object-fit: cover`.
- The pin establishes an isolated foreground stacking context.
- The unified section must not have a fixed normal-motion height that prevents
  ScrollTrigger pin spacing from pushing `UnderwaterScene` downward.
- No horizontal overflow is allowed at desktop, `390x844`, or `844x390`.

## Reduced motion

Under `prefers-reduced-motion: reduce`:

- do not create Lenis;
- do not pin or scrub;
- show the island welcome as a normal viewport section;
- allow normal scrolling directly to `UnderwaterScene`;
- keep controls usable.

## Verification

Automated tests must cover:

- `InvitationJourney` renders the unified sequence before `UnderwaterScene`;
- there is no separate `WelcomeScene` plus transition sibling composition;
- cached and later-loading metadata both initialize the transition;
- scroll progress maps forward and backward to the same video time;
- rAF coalescing prevents multiple seeks in one animation frame;
- reduced motion skips pinning and continuous scrubbing;
- the pinned stage owns an isolated stacking context and normal-flow pin
  spacing reaches the underwater scene.

Browser acceptance must verify:

- desktop welcome composition;
- the first scroll changes the background in place;
- no repeated island section;
- approximately 0%, 50%, and 100% transition frames;
- reverse scrubbing;
- no underwater content during the pin;
- direct final-frame handoff;
- portrait and landscape safe areas and no horizontal overflow;
- upward touch-size scrolling returns to the reversed transition;
- reduced-motion behavior.

<design_plan>
Python RNG mock:
seed = len("single seamless island transition underwater journey") = 51
hero = "Cinematic Center"; components = ["Unified Media Stage", "Overlay Copy", "Normal-Flow Handoff"]
gsap = ["Single Pinned Media Stack", "Direct rAF Playhead"]; typography = "existing approved invitation typography"

Scope check:
This is an invitation experience, not a marketing landing page. The user's
existing single-journey scope overrides navigation, bento, AIDA, CTA, and
footer requirements that would add unrelated sections.

Hero math:
The existing wide centered welcome lockup remains capped to three lines on
mobile and two title lines on desktop. No stamp icons or tag pills are added.

Motion check:
One pinned media stack replaces the former separate-section model. A direct,
rAF-coalesced ScrollTrigger playhead replaces the eased video-time tween.

Label and contrast check:
Only the approved invitation copy and scroll cue appear over the welcome.
Existing high-contrast white typography remains unchanged.
</design_plan>
