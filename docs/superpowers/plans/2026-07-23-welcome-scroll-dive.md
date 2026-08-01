# Welcome Scroll Dive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen island welcome, a reversible GSAP ScrollTrigger video dive driven by Lenis scrolling, and a compact generated underwater title without exposing sea objects during the transition.

**Architecture:** A new client-side `InvitationJourney` composes three sibling sections: `WelcomeScene`, `ScrollDiveTransition`, and the existing `UnderwaterScene`. Lenis and GSAP share one animation clock; ScrollTrigger pins only the transition video and maps scroll progress to video time. The transition uses a seek-optimized derivative of the supplied clip, while the underwater title uses a verified transparent artwork asset and hidden semantic text.

**Tech Stack:** React 19, TypeScript, vinext/Next.js, GSAP 3.15.0, ScrollTrigger, Lenis 1.3.25, Node test runner, FFmpeg/ffprobe, image generation.

## Global Constraints

- Preserve `public/images/underwater/island.mp4`, `transition.mp4`, and `background-main.mp4` unchanged.
- The welcome shows only `Liliana’s 1st Birthday`, `Come swim, sparkle, and celebrate with us!`, and the approved scroll cue.
- The transition video scrubs forward on downward scrolling and backward on upward scrolling.
- Use GSAP ScrollTrigger for pinning and scrubbing and Lenis for smooth scrolling.
- During the pinned transition, render no mermaid, sea object, fish school, ambient layer, title, control, bubble, or party-detail interface.
- Keep the existing underwater interaction model and content outside the title replacement and the touch-action change required for vertical scrolling.
- The optimized transition asset is 1920×1080 at 30 fps, H.264, silent, fast-start, with a fixed keyframe interval no longer than 0.2 seconds.
- The underwater title artwork contains exactly `Liliana’s First Birthday`, has a transparent background, and follows the pearlescent script-and-serif direction in `public/og.png`.
- Under `prefers-reduced-motion: reduce`, do not initialize Lenis, pin the transition, or scrub video time continuously.
- Preserve all unrelated uncommitted work in the `background-fish` worktree.

---

## File Map

- Create `components/invitation/WelcomeScene.tsx`: semantic welcome copy and looping island video.
- Create `components/invitation/ScrollDiveTransition.tsx`: metadata-gated GSAP/ScrollTrigger video timeline.
- Create `components/invitation/InvitationJourney.tsx`: Lenis lifecycle and three-section composition.
- Create `lib/scrollVideo.mjs`: clamp scroll progress and calculate a seek-safe video time.
- Create `tests/scroll-video.test.mjs`: unit coverage for scroll-to-time mapping.
- Create `tests/invitation-journey.test.mjs`: source and render-contract coverage for section order, media, isolation, Lenis, ScrollTrigger, and title semantics.
- Create `public/images/underwater/transition-scrub.mp4`: optimized derivative of the supplied transition.
- Create `public/images/ui/liliana-underwater-title.png`: generated transparent title artwork.
- Modify `app/page.tsx`: render `InvitationJourney`.
- Modify `app/globals.css`: enable document scrolling; add welcome, transition, reduced-motion, and title styles; permit vertical touch scrolling in the underwater scene.
- Modify `components/underwater/UnderwaterScene.tsx:599`: replace the existing title markup with the compact artwork and hidden semantic title.
- Modify `tests/rendered-html.test.mjs`: assert the new journey order and updated invitation copy contract.
- Modify `package.json` and `package-lock.json`: add GSAP and Lenis and include the new unit tests.

---

### Task 1: Motion dependencies and seek-time helper

**Files:**
- Create: `lib/scrollVideo.mjs`
- Create: `tests/scroll-video.test.mjs`
- Modify: `package.json:18-24`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: numeric ScrollTrigger progress, media duration, and optional end-frame padding.
- Produces: `scrollProgressToTime(progress: number, duration: number, endPadding?: number): number` for `ScrollDiveTransition`.

- [ ] **Step 1: Write the failing seek-time tests**

Create `tests/scroll-video.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { scrollProgressToTime } from "../lib/scrollVideo.mjs";

test("maps clamped scroll progress to a seek-safe video time", () => {
  assert.equal(scrollProgressToTime(-1, 8.08), 0);
  assert.equal(scrollProgressToTime(Number.NaN, 8.08), 0);
  assert.equal(scrollProgressToTime(1, -4), 0);
  assert.ok(Math.abs(scrollProgressToTime(0.5, 8.08) - 4.0233333333) < 0.0001);
  assert.ok(Math.abs(scrollProgressToTime(1, 8.08) - 8.0466666667) < 0.0001);
  assert.ok(Math.abs(scrollProgressToTime(1, 8.08, 0.2) - 7.88) < 0.0001);
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```powershell
rtk test node --test tests/scroll-video.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/scrollVideo.mjs`.

- [ ] **Step 3: Implement the minimal helper**

Create `lib/scrollVideo.mjs`:

```js
export function scrollProgressToTime(progress, duration, endPadding = 1 / 30) {
  const safeProgress = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const safePadding = Number.isFinite(endPadding)
    ? Math.min(safeDuration, Math.max(0, endPadding))
    : 0;

  return safeProgress * Math.max(0, safeDuration - safePadding);
}
```

- [ ] **Step 4: Run the unit test and verify it passes**

Run:

```powershell
rtk test node --test tests/scroll-video.test.mjs
```

Expected: one passing test and no failures.

- [ ] **Step 5: Install exact motion dependencies**

Run:

```powershell
rtk npm install --save-exact gsap@3.15.0 lenis@1.3.25
```

Expected: `package.json` contains exact dependency entries for `gsap` and `lenis`, and `package-lock.json` resolves both packages without unrelated dependency removals.

- [ ] **Step 6: Verify dependency resolution and types**

Run:

```powershell
rtk npm ls gsap lenis
rtk npm run typecheck
```

Expected: both packages resolve at the requested versions and TypeScript exits successfully.

- [ ] **Step 7: Commit the helper and dependencies**

```powershell
rtk git add package.json package-lock.json lib/scrollVideo.mjs tests/scroll-video.test.mjs
rtk git commit -m "feat: prepare scroll video motion stack"
```

---

### Task 2: Island welcome scene

**Files:**
- Create: `components/invitation/WelcomeScene.tsx`
- Create: `tests/invitation-journey.test.mjs`
- Modify: `app/globals.css:30-52`

**Interfaces:**
- Consumes: `eventDetails.title` and `eventDetails.invitationMessage`.
- Produces: `WelcomeScene(): JSX.Element`, with `.welcome-scene` as its section root.

- [ ] **Step 1: Write the failing welcome contract test**

Create `tests/invitation-journey.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("welcome scene uses the island video and only the approved invitation copy", async () => {
  const source = await readFile(
    new URL("../components/invitation/WelcomeScene.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /className="welcome-scene"/);
  assert.match(source, /island\.mp4/);
  assert.match(source, /eventDetails\.title/);
  assert.match(source, /eventDetails\.invitationMessage/);
  assert.match(source, /Scroll to dive/);
  assert.doesNotMatch(source, /eventDetails\.(date|time|venue|rsvp|eyebrow)/);
});
```

- [ ] **Step 2: Run the test and verify the missing-file failure**

Run:

```powershell
rtk test node --test tests/invitation-journey.test.mjs
```

Expected: FAIL with `ENOENT` for `components/invitation/WelcomeScene.tsx`.

- [ ] **Step 3: Implement the semantic welcome component**

Create `components/invitation/WelcomeScene.tsx`:

```tsx
import { eventDetails } from "@/data/eventDetails";

export function WelcomeScene() {
  return (
    <section className="welcome-scene" aria-labelledby="welcome-title">
      <video
        className="welcome-background"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/images/underwater/island.mp4" type="video/mp4" />
      </video>
      <div className="welcome-shade" aria-hidden="true" />
      <div className="welcome-copy">
        <h1 id="welcome-title">
          <span>Liliana’s</span>
          <span>First Birthday</span>
        </h1>
        <p>{eventDetails.invitationMessage}</p>
      </div>
      <div className="welcome-scroll-cue" aria-hidden="true">
        <span>Scroll to dive</span>
        <i />
      </div>
    </section>
  );
}
```

Use explicit title spans so the visual line break remains stable while `eventDetails.title` stays the canonical semantic copy in the test and accessible label. Add `aria-label={eventDetails.title}` to the `h1` when implementing:

```tsx
<h1 id="welcome-title" aria-label={eventDetails.title}>
```

- [ ] **Step 4: Add the welcome layout and typography styles**

Append before the underwater scene rules in `app/globals.css`:

```css
.invitation-journey { width: 100%; background: var(--ocean-deep); }

.welcome-scene {
  position: relative;
  isolation: isolate;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100vh;
  height: 100svh;
  min-height: 520px;
  overflow: hidden;
}

.welcome-background,
.transition-video {
  position: absolute;
  z-index: -2;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  pointer-events: none;
}

.welcome-shade {
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(3, 77, 121, 0.08), rgba(3, 71, 104, 0.02) 45%, rgba(3, 61, 91, 0.28)),
    radial-gradient(circle at 50% 48%, rgba(2, 52, 77, 0.02) 24%, rgba(2, 48, 73, 0.18) 100%);
  pointer-events: none;
}

.welcome-copy {
  width: min(760px, calc(100% - 36px));
  margin-top: clamp(190px, 34vh, 330px);
  color: white;
  text-align: center;
  text-shadow: 0 4px 18px rgba(2, 53, 82, 0.76);
}

.welcome-copy h1 {
  display: grid;
  justify-items: center;
  margin: 0;
  font-family: "Bodoni Moda", Georgia, serif;
  font-weight: 600;
  line-height: 0.9;
}

.welcome-copy h1 span:first-child {
  font-size: clamp(3.2rem, 8vw, 6.8rem);
  font-style: italic;
}

.welcome-copy h1 span:last-child {
  margin-top: 0.16em;
  font-size: clamp(1.65rem, 4vw, 3.2rem);
  letter-spacing: 0.01em;
}

.welcome-copy p {
  margin: 22px auto 0;
  font-size: clamp(0.95rem, 2vw, 1.24rem);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.welcome-scroll-cue {
  position: absolute;
  bottom: max(24px, calc(env(safe-area-inset-bottom) + 14px));
  left: 50%;
  display: grid;
  justify-items: center;
  gap: 8px;
  transform: translateX(-50%);
  color: white;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-shadow: 0 2px 9px rgba(2, 53, 82, 0.72);
}

.welcome-scroll-cue i {
  width: 1px;
  height: 34px;
  background: linear-gradient(white, transparent);
  animation: scroll-cue 1.8s ease-in-out infinite;
}

@keyframes scroll-cue {
  0%, 100% { opacity: 0.35; transform: scaleY(0.55); transform-origin: top; }
  50% { opacity: 1; transform: scaleY(1); transform-origin: top; }
}
```

- [ ] **Step 5: Run the component contract test and CSS check**

Run:

```powershell
rtk test node --test tests/invitation-journey.test.mjs
rtk npm run typecheck
```

Expected: one passing test and no formatting errors.

- [ ] **Step 6: Commit the welcome scene**

```powershell
rtk git add components/invitation/WelcomeScene.tsx tests/invitation-journey.test.mjs app/globals.css
rtk git commit -m "feat: add island welcome scene"
```

---

### Task 3: Seek-optimized transition and ScrollTrigger scrub

**Files:**
- Create: `public/images/underwater/transition-scrub.mp4`
- Create: `components/invitation/ScrollDiveTransition.tsx`
- Modify: `tests/invitation-journey.test.mjs`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `scrollProgressToTime`, the optimized transition clip, and the original clip as fallback.
- Produces: `ScrollDiveTransition(): JSX.Element`, `.scroll-dive-transition`, and one ScrollTrigger-controlled paused video.

- [ ] **Step 1: Add the failing ScrollTrigger isolation test**

Append to `tests/invitation-journey.test.mjs`:

```js
test("transition pins and scrubs only the dive video", async () => {
  const source = await readFile(
    new URL("../components/invitation/ScrollDiveTransition.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ScrollTrigger/);
  assert.match(source, /scrollProgressToTime/);
  assert.match(source, /start:\s*"top top"/);
  assert.match(source, /scrub:\s*0\.15/);
  assert.match(source, /pin:\s*pin/);
  assert.match(source, /window\.innerHeight \* 3\.5/);
  assert.match(source, /transition-scrub\.mp4/);
  assert.match(source, /transition\.mp4/);
  assert.doesNotMatch(source, /UnderwaterScene|MermaidCharacter|InteractiveSeaObject|BackgroundFishSchools|AmbientLayers/);
});
```

- [ ] **Step 2: Run the test and verify the missing-file failure**

Run:

```powershell
rtk test node --test tests/invitation-journey.test.mjs
```

Expected: the welcome test passes and the transition test fails with `ENOENT`.

- [ ] **Step 3: Encode the exact seek-optimized derivative**

Run:

```powershell
rtk ffmpeg -y -i public/images/underwater/transition.mp4 -an -vf "scale=1920:1080:flags=lanczos,fps=30" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -g 6 -keyint_min 6 -sc_threshold 0 -movflags +faststart public/images/underwater/transition-scrub.mp4
```

Verify:

```powershell
rtk ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration -of json public/images/underwater/transition-scrub.mp4
rtk ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 public/images/underwater/transition-scrub.mp4
```

Expected: H.264, 1920×1080, 30/1 fps, duration matching the 8.08-second source within one frame, and no audio-stream output.

- [ ] **Step 4: Implement the ScrollTrigger video component**

Create `components/invitation/ScrollDiveTransition.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

import { scrollProgressToTime } from "@/lib/scrollVideo.mjs";

export function ScrollDiveTransition() {
  const triggerRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const trigger = triggerRef.current;
    const pin = pinRef.current;
    const video = videoRef.current;
    if (!trigger || !pin || !video || duration <= 0) return;

    gsap.registerPlugin(ScrollTrigger);
    video.pause();

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          video,
          { currentTime: 0 },
          {
            currentTime: scrollProgressToTime(1, duration),
            ease: "none",
            scrollTrigger: {
              trigger,
              start: "top top",
              end: () => `+=${window.innerHeight * 3.5}`,
              scrub: 0.15,
              pin,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          },
        );
      }, trigger);

      ScrollTrigger.refresh();
      return () => context.revert();
    });

    return () => media.revert();
  }, [duration]);

  return (
    <section ref={triggerRef} className="scroll-dive-transition" aria-hidden="true">
      <div ref={pinRef} className="scroll-dive-pin">
        <video
          ref={videoRef}
          className="transition-video"
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            const clipDuration = video.duration;
            video.pause();
            video.currentTime = window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? scrollProgressToTime(1, clipDuration)
              : 0;
            setDuration(clipDuration);
          }}
        >
          <source src="/images/underwater/transition-scrub.mp4" type="video/mp4" />
          <source src="/images/underwater/transition.mp4" type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add transition and reduced-motion CSS**

Append after the welcome rules in `app/globals.css`:

```css
.scroll-dive-transition { position: relative; width: 100%; height: 100vh; height: 100svh; }
.scroll-dive-pin { position: relative; width: 100%; height: 100vh; height: 100svh; overflow: hidden; background: #078fbd; }
.transition-video { z-index: 0; object-position: center; }

@media (prefers-reduced-motion: reduce) {
  .scroll-dive-transition,
  .scroll-dive-pin { height: min(72svh, 720px); }
  .transition-video { object-position: center bottom; }
}
```

- [ ] **Step 6: Run focused checks**

Run:

```powershell
rtk test node --test tests/scroll-video.test.mjs tests/invitation-journey.test.mjs
rtk npm run typecheck
```

Expected: all focused tests pass and TypeScript exits successfully.

- [ ] **Step 7: Commit the transition component and asset**

```powershell
rtk git add components/invitation/ScrollDiveTransition.tsx public/images/underwater/transition-scrub.mp4 tests/invitation-journey.test.mjs app/globals.css
rtk git commit -m "feat: add reversible scroll dive transition"
```

---

### Task 4: Lenis journey integration and document scrolling

**Files:**
- Create: `components/invitation/InvitationJourney.tsx`
- Modify: `app/page.tsx:1-5`
- Modify: `app/globals.css:30-68`
- Modify: `components/underwater/UnderwaterScene.tsx:534-667`
- Modify: `tests/invitation-journey.test.mjs`
- Modify: `tests/rendered-html.test.mjs:15-52`
- Modify: `package.json:13`

**Interfaces:**
- Consumes: `WelcomeScene`, `ScrollDiveTransition`, and `UnderwaterScene`.
- Produces: `InvitationJourney(): JSX.Element` and the single Lenis instance for the page lifecycle.

- [ ] **Step 1: Add failing journey-order and Lenis tests**

Append to `tests/invitation-journey.test.mjs`:

```js
test("journey owns Lenis and keeps the underwater scene after the transition", async () => {
  const source = await readFile(
    new URL("../components/invitation/InvitationJourney.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /new Lenis/);
  assert.match(source, /ScrollTrigger\.update/);
  assert.match(source, /gsap\.ticker\.add/);
  assert.match(source, /lenis\.raf\(time \* 1000\)/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /lenis\.destroy\(\)/);

  const welcome = source.indexOf("<WelcomeScene");
  const transition = source.indexOf("<ScrollDiveTransition");
  const underwater = source.indexOf("<UnderwaterScene");
  assert.ok(welcome >= 0 && welcome < transition && transition < underwater);
});
```

Update the first rendered-shell test in `tests/rendered-html.test.mjs` by replacing the old copy assertions with:

```js
  assert.match(html, /Liliana(?:’|&#x27;)s First Birthday/i);
  assert.match(html, /Come swim, sparkle, and celebrate with us!/i);
  assert.match(html, /Scroll to dive/i);
  assert.doesNotMatch(html, /A little mermaid is turning one/i);
  assert.doesNotMatch(html, /A magical under-the-sea invitation/i);
  assert.match(html, /island\.mp4/i);
  assert.match(html, /transition-scrub\.mp4/i);

  const welcomeIndex = html.indexOf("welcome-scene");
  const transitionIndex = html.indexOf("scroll-dive-transition");
  const underwaterIndex = html.indexOf("underwater-scene");
  assert.ok(welcomeIndex >= 0 && welcomeIndex < transitionIndex);
  assert.ok(transitionIndex < underwaterIndex);
```

- [ ] **Step 2: Run the tests and verify the journey file is missing**

Run:

```powershell
rtk test node --test tests/invitation-journey.test.mjs
```

Expected: existing component tests pass and the journey test fails with `ENOENT`.

- [ ] **Step 3: Implement the Lenis lifecycle and section composition**

Create `components/invitation/InvitationJourney.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";

import { UnderwaterScene } from "@/components/underwater/UnderwaterScene";
import { ScrollDiveTransition } from "./ScrollDiveTransition";
import { WelcomeScene } from "./WelcomeScene";

export function InvitationJourney() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      syncTouch: false,
      lerp: 0.1,
    });
    const tick = (time: number) => lenis.raf(time * 1000);

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="invitation-journey">
      <WelcomeScene />
      <ScrollDiveTransition />
      <UnderwaterScene />
    </main>
  );
}
```

- [ ] **Step 4: Wire the page entry point**

Replace `app/page.tsx` with:

```tsx
import { InvitationJourney } from "@/components/invitation/InvitationJourney";

export default function Home() {
  return <InvitationJourney />;
}
```

In `components/underwater/UnderwaterScene.tsx`, change the root element opened near line 534 from `<main` to `<section`, retain every existing prop and handler, and change its matching closing `</main>` to `</section>`. This keeps `InvitationJourney` as the page’s only `<main>` landmark.

- [ ] **Step 5: Enable page and reverse touch scrolling**

At the top of `app/globals.css`, add the Lenis stylesheet after the Tailwind import:

```css
@import "tailwindcss";
@import "lenis/dist/lenis.css";
```

Replace the body overflow rule with:

```css
body {
  overflow-x: hidden;
  background: var(--ocean-deep);
  color: var(--ocean-ink);
  font-family: "Avenir Next", "Nunito", "Segoe UI", sans-serif;
}
```

Change the underwater scene gesture rules to:

```css
.underwater-scene {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100vh;
  height: 100svh;
  min-height: 520px;
  overflow: hidden;
  overscroll-behavior-x: none;
  touch-action: pan-y;
  user-select: none;
  cursor: none;
}

.underwater-scene[data-dialog-open] { touch-action: pan-y; cursor: none; }
```

This keeps tap-to-guide and button activation while allowing vertical touch gestures to return to the reversible transition.

- [ ] **Step 6: Include the new tests in the unit script**

Set `package.json`’s `test:unit` script to:

```json
"test:unit": "node --test tests/asset-contract.test.mjs tests/sprite-runtime.test.mjs tests/scroll-video.test.mjs tests/invitation-journey.test.mjs"
```

- [ ] **Step 7: Run integration checks**

Run:

```powershell
rtk npm run test:unit
rtk npm run typecheck
rtk npm run build
rtk test node --test tests/rendered-html.test.mjs
```

Expected: all unit tests pass, TypeScript succeeds, the production build succeeds, and rendered HTML contains the welcome, transition, and underwater sections in that order.

- [ ] **Step 8: Commit the journey integration**

```powershell
rtk git add components/invitation/InvitationJourney.tsx components/underwater/UnderwaterScene.tsx app/page.tsx app/globals.css tests/invitation-journey.test.mjs tests/rendered-html.test.mjs package.json
rtk git commit -m "feat: connect Lenis invitation journey"
```

---

### Task 5: Generate and integrate the compact underwater title

**Files:**
- Create: `public/images/ui/liliana-underwater-title.png`
- Modify: `components/underwater/UnderwaterScene.tsx:599-607`
- Modify: `app/globals.css:121-195, 514-536`
- Modify: `tests/invitation-journey.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `public/og.png` as the visual reference and `eventDetails.title` as semantic text.
- Produces: a transparent decorative PNG and `.underwater-title-lockup` markup with an accessible hidden heading.

- [ ] **Step 1: Add the failing title asset and semantics test**

Append to `tests/invitation-journey.test.mjs`:

```js
test("underwater title uses verified artwork and semantic text", async () => {
  const scene = await readFile(
    new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url),
    "utf8",
  );

  assert.match(scene, /className="underwater-title-lockup"/);
  assert.match(scene, /liliana-underwater-title\.png/);
  assert.match(scene, /<h2 className="sr-only">\{eventDetails\.title\}<\/h2>/);
  assert.doesNotMatch(scene, /className="title-bubble"/);
});
```

In `tests/rendered-html.test.mjs`, add:

```js
  assert.match(html, /liliana-underwater-title\.png/i);
  await access(new URL("../public/images/ui/liliana-underwater-title.png", import.meta.url));
```

- [ ] **Step 2: Run the tests and verify the expected title failures**

Run:

```powershell
rtk test node --test tests/invitation-journey.test.mjs
```

Expected: the new title test fails because the existing scene still uses `.title-bubble`.

- [ ] **Step 3: Generate the transparent title artwork from the approved reference**

Use the `imagegen` skill with `public/og.png` as the referenced image and this exact prompt:

```text
Create a wide transparent PNG title lockup inspired only by the typography and pearlescent finish in the supplied OG image. Include exactly two centered lines of text and no other words: “Liliana’s” on the first line and “First Birthday” on the second line. Use elegant flowing calligraphy for “Liliana’s” and a refined high-contrast serif for “First Birthday.” Render pearl-white lettering with shell-pink and lavender iridescence, fine beveled highlights, a thin cool-aqua rim light, and a subtle deep-ocean shadow. Add at most one tiny pearl-and-shell flourish centered beneath the second line. Transparent background, generous transparent padding, clean alpha edges, wide 3:1 composition. Do not add a card, plaque, scene, coral, mermaid, person, chest, border, or extra text.
```

Save the accepted result as `public/images/ui/liliana-underwater-title.png`. Inspect it at original resolution. If any letter, apostrophe, word, transparency edge, or crop is wrong, edit the same image with image generation until the exact text and transparent output are correct.

- [ ] **Step 4: Replace the underwater title markup**

Replace the current `.title-bubble` header in `components/underwater/UnderwaterScene.tsx` with:

```tsx
      <header className="underwater-title-lockup">
        <img
          className="underwater-title-art"
          src="/images/ui/liliana-underwater-title.png"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <h2 className="sr-only">{eventDetails.title}</h2>
      </header>
```

- [ ] **Step 5: Replace the old title CSS with the compact artwork rules**

Remove `.title-bubble`, `.title-eyebrow`, `.title-name`, `.title-occasion`, and `.title-subtitle` blocks and their mobile/landscape overrides. Add:

```css
.underwater-title-lockup {
  position: absolute;
  z-index: 35;
  top: max(8px, env(safe-area-inset-top));
  left: 50%;
  width: clamp(220px, 30vw, 400px);
  transform: translateX(-50%);
  pointer-events: none;
  filter: drop-shadow(0 8px 14px rgba(2, 66, 92, 0.28));
}

.underwater-title-art {
  display: block;
  width: 100%;
  height: auto;
}

@media (max-width: 760px) {
  .underwater-title-lockup {
    top: max(4px, env(safe-area-inset-top));
    width: clamp(210px, 58vw, 300px);
  }
}

@media (max-height: 650px) and (orientation: landscape) {
  .underwater-title-lockup { top: 2px; width: 240px; }
}
```

- [ ] **Step 6: Run title and render checks**

Run:

```powershell
rtk test node --test tests/invitation-journey.test.mjs
rtk npm run build
rtk test node --test tests/rendered-html.test.mjs
```

Expected: title contract passes, build succeeds, rendered HTML references the artwork, and the asset exists.

- [ ] **Step 7: Commit the verified title**

```powershell
rtk git add public/images/ui/liliana-underwater-title.png components/underwater/UnderwaterScene.tsx app/globals.css tests/invitation-journey.test.mjs tests/rendered-html.test.mjs
rtk git commit -m "feat: refine underwater invitation title"
```

---

### Task 6: Browser acceptance and final regression gate

**Files:**
- Modify only files implicated by failures caused by Tasks 1-5.

**Interfaces:**
- Consumes: the completed journey, transition asset, and underwater scene.
- Produces: evidence that the approved experience works forward, backward, responsively, and under reduced motion.

- [ ] **Step 1: Run the complete automated gate**

Run:

```powershell
rtk npm run test:unit
rtk npm run typecheck
rtk npm run lint
rtk npm run build
rtk test node --test tests/*.test.mjs
```

Expected: all commands exit successfully. If a failure is pre-existing and unrelated, record its exact command and output rather than changing unrelated code.

- [ ] **Step 2: Start the local site and inspect the initial welcome**

Run:

```powershell
rtk npm run dev
```

Open the reported local URL in a browser. Verify at desktop width:

- The island video fills the viewport and loops.
- The family remains unobscured.
- Only the title, approved welcome message, and `Scroll to dive` cue are visible.
- No underwater object or control appears.

- [ ] **Step 3: Verify forward and reverse scrub behavior**

Scroll slowly through the transition and verify:

- The video is pinned for the entire 350vh distance.
- Scroll progress near 0%, 50%, and 100% shows the island, waterline, and underwater frames respectively.
- The video never free-runs independently of scrolling.
- Scrolling upward reverses the same frames without jumping to the start.
- No mermaid, fish, sea object, title, bubble, button, or music control is visible during any transition frame.
- The final frame hands off to `background-main.mp4` without a white flash or unrelated image.

- [ ] **Step 4: Verify the underwater scene and title**

At the underwater section, confirm:

- The generated title is correctly spelled and remains small at the top center.
- The title has no card background and is visually consistent with `public/og.png`.
- The mermaid, sea objects, fish schools, details, and music control retain their current behavior.
- Desktop pointer guidance works.
- On a touch-size viewport, tapping guides Liliana and vertical swiping can return to the reversed transition.

- [ ] **Step 5: Verify responsive and reduced-motion behavior**

Check at 390×844 portrait and 844×390 landscape:

- Videos remain full bleed without horizontal scrolling.
- Welcome copy and the underwater title stay inside safe areas.
- Touch scrolling is not trapped.

Enable reduced motion and reload:

- Lenis smoothing is absent.
- The transition is not pinned or continuously scrubbed.
- Normal scrolling reaches the underwater scene.
- Interactive controls remain usable.

- [ ] **Step 6: Inspect the final diff and commit any acceptance-only correction**

Run:

```powershell
rtk git diff --check
rtk git status --short
rtk git diff --stat
```

If browser acceptance required a focused correction, use `rtk git status --short` to identify only the files changed by that correction, pass those literal paths after `rtk git add --`, and commit them with `rtk git commit -m "fix: complete scroll dive acceptance"`.

If no correction was required, do not create an empty commit.
