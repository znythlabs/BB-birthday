# Single-Canvas Scroll Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate island welcome and dive-transition sections with one pinned media canvas that begins scrubbing in place on the first scroll movement and releases directly into the underwater scene.

**Architecture:** `WelcomeDiveSequence` owns one pinned viewport containing stacked island and transition videos plus the welcome copy. ScrollTrigger maps one `0..1` progress value to copy exit, video crossfade, and an rAF-coalesced transition playhead; `InvitationJourney` continues to own Lenis and renders `UnderwaterScene` immediately after the unified sequence.

**Tech Stack:** Next.js, React, TypeScript, GSAP ScrollTrigger, Lenis, Node test runner, CSS

## Global Constraints

- The island welcome, dive transition, and underwater scene must feel like one continuous cinematic section.
- The first downward scroll must change the background in the existing welcome viewport; it must not reveal a second island section.
- Fade the welcome title, message, and cue during the first 10% of scroll progress.
- Use GSAP ScrollTrigger for pinning and Lenis for smooth document scrolling.
- Map downward and upward scrolling to the same transition frames in forward and reverse order.
- Coalesce transition-video seeks through one `requestAnimationFrame`; do not animate `video.currentTime` with an eased GSAP tween.
- During the pinned sequence, no mermaid, sea object, fish school, title, button, bubble, or music control may paint above the media stage.
- The unified normal-motion section must derive its height from ScrollTrigger pin spacing so `UnderwaterScene` remains after the full 350vh dive.
- Under `prefers-reduced-motion: reduce`, do not create Lenis, pin, or continuously scrub.
- Preserve the current compact underwater title and all underwater interaction behavior.
- Do not modify or stage any supplied video asset. Preserve the user's current `public/images/underwater/background-main.mp4` modification and untracked `public/images/underwater/newunderwater.mp4`.
- Preserve unrelated untracked `.agents/`, `.claude/`, `.codex/`, and `.superpowers/` content.

---

## File Map

- Modify `lib/scrollVideo.mjs`: add a small rAF-coalesced video seeker.
- Modify `tests/scroll-video.test.mjs`: cover coalescing, latest-target wins, thresholding, and cleanup.
- Create `components/invitation/WelcomeDiveSequence.tsx`: unified island, copy, transition, metadata, and ScrollTrigger lifecycle.
- Modify `components/invitation/InvitationJourney.tsx`: render the unified sequence directly before `UnderwaterScene`.
- Delete `components/invitation/WelcomeScene.tsx`: superseded by `WelcomeDiveSequence`.
- Delete `components/invitation/ScrollDiveTransition.tsx`: superseded by `WelcomeDiveSequence`.
- Modify `app/globals.css`: replace the two-section layout with one isolated stacked-media canvas.
- Modify `tests/invitation-journey.test.mjs`: assert the unified component, lifecycle, isolation, and journey order.
- Modify `tests/rendered-html.test.mjs`: assert one unified welcome/dive stage and its normal-flow handoff.

---

### Task 1: rAF-coalesced transition playhead

**Files:**
- Modify: `lib/scrollVideo.mjs`
- Test: `tests/scroll-video.test.mjs`

**Interfaces:**
- Consumes: a video-like object with a numeric `currentTime`, a request-frame function, a cancel-frame function, and optional minimum seek delta.
- Produces: `createRafVideoSeeker(video, options): { seek(time: number): void; cancel(): void }`.

- [ ] **Step 1: Write the failing seeker tests**

Update `tests/scroll-video.test.mjs` to:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  createRafVideoSeeker,
  scrollProgressToTime,
} from "../lib/scrollVideo.mjs";

test("maps clamped scroll progress to a seek-safe video time", () => {
  assert.equal(scrollProgressToTime(-1, 8.08), 0);
  assert.equal(scrollProgressToTime(Number.NaN, 8.08), 0);
  assert.equal(scrollProgressToTime(1, -4), 0);
  assert.ok(Math.abs(scrollProgressToTime(0.5, 8.08) - 4.0233333333) < 0.0001);
  assert.ok(Math.abs(scrollProgressToTime(1, 8.08) - 8.0466666667) < 0.0001);
  assert.ok(Math.abs(scrollProgressToTime(1, 8.08, 0.2) - 7.88) < 0.0001);
});

test("coalesces repeated seeks and applies only the latest target", () => {
  const video = { currentTime: 0 };
  const callbacks = new Map();
  let requests = 0;

  const seeker = createRafVideoSeeker(video, {
    requestFrame(callback) {
      requests += 1;
      callbacks.set(requests, callback);
      return requests;
    },
    cancelFrame() {},
  });

  seeker.seek(2);
  seeker.seek(4);

  assert.equal(requests, 1);
  assert.equal(video.currentTime, 0);
  callbacks.get(1)();
  assert.equal(video.currentTime, 4);
});

test("skips immaterial seeks and cancels a pending frame", () => {
  const video = { currentTime: 4 };
  const callbacks = new Map();
  const cancelled = [];
  let requests = 0;

  const seeker = createRafVideoSeeker(video, {
    minDelta: 1 / 120,
    requestFrame(callback) {
      requests += 1;
      callbacks.set(requests, callback);
      return requests;
    },
    cancelFrame(frameId) {
      cancelled.push(frameId);
    },
  });

  seeker.seek(4 + 1 / 240);
  callbacks.get(1)();
  assert.equal(video.currentTime, 4);

  seeker.seek(6);
  seeker.cancel();
  assert.deepEqual(cancelled, [2]);
  assert.equal(video.currentTime, 4);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
rtk test node --test tests/scroll-video.test.mjs
```

Expected: FAIL because `createRafVideoSeeker` is not exported.

- [ ] **Step 3: Implement the minimal seeker**

Append to `lib/scrollVideo.mjs`:

```js
export function createRafVideoSeeker(
  video,
  {
    requestFrame = globalThis.requestAnimationFrame,
    cancelFrame = globalThis.cancelAnimationFrame,
    minDelta = 1 / 120,
  } = {},
) {
  let frameId = null;
  let targetTime = 0;

  const flush = () => {
    frameId = null;
    if (Math.abs(video.currentTime - targetTime) >= minDelta) {
      video.currentTime = targetTime;
    }
  };

  return {
    seek(time) {
      targetTime = Number.isFinite(time) ? Math.max(0, time) : 0;
      if (frameId === null) frameId = requestFrame(flush);
    },
    cancel() {
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
    },
  };
}
```

- [ ] **Step 4: Run focused and unit tests**

Run:

```powershell
rtk test node --test tests/scroll-video.test.mjs
rtk npm run test:unit
```

Expected: all tests pass with no failures.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
rtk git add -- lib/scrollVideo.mjs tests/scroll-video.test.mjs
rtk git commit -m "feat: coalesce scroll video seeks"
```

---

### Task 2: Unified pinned welcome and dive sequence

**Files:**
- Create: `components/invitation/WelcomeDiveSequence.tsx`
- Modify: `components/invitation/InvitationJourney.tsx`
- Modify: `app/globals.css`
- Modify: `tests/invitation-journey.test.mjs`
- Modify: `tests/rendered-html.test.mjs`
- Delete: `components/invitation/WelcomeScene.tsx`
- Delete: `components/invitation/ScrollDiveTransition.tsx`

**Interfaces:**
- Consumes: `scrollProgressToTime`, `createRafVideoSeeker`, `eventDetails`, GSAP, and ScrollTrigger.
- Produces: `WelcomeDiveSequence(): JSX.Element`, rendered immediately before `UnderwaterScene`.

- [ ] **Step 1: Rewrite the journey contract tests for one sequence**

Replace the welcome/transition/journey tests in `tests/invitation-journey.test.mjs` with:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("unified welcome dive sequence owns both videos and approved copy", async () => {
  const source = await readFile(
    new URL("../components/invitation/WelcomeDiveSequence.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /className="welcome-dive-sequence"/);
  assert.match(source, /island\.mp4/);
  assert.match(source, /transition-scrub\.mp4/);
  assert.match(source, /transition\.mp4/);
  assert.match(source, /eventDetails\.title/);
  assert.match(source, /eventDetails\.invitationMessage/);
  assert.match(source, /Scroll to dive/);
  assert.doesNotMatch(source, /eventDetails\.(date|time|venue|rsvp|eyebrow)/);
  assert.doesNotMatch(source, /UnderwaterScene|MermaidCharacter|InteractiveSeaObject|BackgroundFishSchools|AmbientLayers/);
});

test("unified sequence pins once and directly updates a coalesced playhead", async () => {
  const source = await readFile(
    new URL("../components/invitation/WelcomeDiveSequence.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ScrollTrigger\.create/);
  assert.match(source, /createRafVideoSeeker/);
  assert.match(source, /scrollProgressToTime/);
  assert.match(source, /start:\s*"top top"/);
  assert.match(source, /pin:\s*pin/);
  assert.match(source, /window\.innerHeight \* 3\.5/);
  assert.match(source, /onUpdate:\s*\(self\)/);
  assert.match(source, /progress \/ 0\.03/);
  assert.match(source, /progress \/ 0\.1/);
  assert.doesNotMatch(source, /scrub:\s*0\.15/);
  assert.match(source, /video\.readyState >= 1/);
  assert.match(source, /addEventListener\("loadedmetadata"/);
  assert.match(source, /removeEventListener\("loadedmetadata"/);
});

test("journey renders one unified sequence before the underwater scene", async () => {
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

  const sequence = source.indexOf("<WelcomeDiveSequence");
  const underwater = source.indexOf("<UnderwaterScene");
  assert.ok(sequence >= 0 && sequence < underwater);
  assert.doesNotMatch(source, /<WelcomeScene|<ScrollDiveTransition/);
});

test("underwater title uses verified artwork and semantic text", async () => {
  const scene = await readFile(
    new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url),
    "utf8",
  );

  assert.match(scene, /className="underwater-title-lockup"/);
  assert.match(scene, /liliana-underwater-title\.png/);
  assert.match(scene, /<h2 className="sr-only">Liliana’s First Birthday<\/h2>/);
  assert.doesNotMatch(scene, /className="title-bubble"/);
});
```

Update the shell assertions in `tests/rendered-html.test.mjs`:

```js
const sequenceIndex = html.indexOf("welcome-dive-sequence");
const underwaterIndex = html.indexOf("underwater-scene");
assert.ok(sequenceIndex >= 0 && sequenceIndex < underwaterIndex);
assert.doesNotMatch(html, /scroll-dive-transition/);

const sequenceHtml = html.slice(sequenceIndex, underwaterIndex);
assert.match(sequenceHtml, /island\.mp4/i);
assert.match(sequenceHtml, /transition-scrub\.mp4/i);
assert.doesNotMatch(sequenceHtml, /Open all party details/i);
```

Replace the pinned-transition CSS test with:

```js
test("keeps one unified media stage above a normal-flow underwater handoff", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const sequenceRule = css.match(/\.welcome-dive-sequence\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(
    css,
    /\.welcome-dive-pin\s*\{[^}]*isolation:\s*isolate;[^}]*z-index:\s*1/s,
  );
  assert.doesNotMatch(sequenceRule, /height\s*:/);
  assert.match(css, /\.welcome-dive-transition\s*\{[^}]*opacity:\s*0/);
  assert.doesNotMatch(css, /\.scroll-dive-transition\s*\{/);
});
```

- [ ] **Step 2: Run the focused contracts and verify RED**

Run:

```powershell
rtk test node --test tests/invitation-journey.test.mjs
rtk npm run build
rtk test node --test tests/rendered-html.test.mjs
```

Expected: FAIL because `WelcomeDiveSequence.tsx` and the unified markup/CSS do not exist.

- [ ] **Step 3: Create `WelcomeDiveSequence`**

Create `components/invitation/WelcomeDiveSequence.tsx`:

```tsx
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

import { eventDetails } from "@/data/eventDetails";
import {
  createRafVideoSeeker,
  scrollProgressToTime,
} from "@/lib/scrollVideo.mjs";

export function WelcomeDiveSequence() {
  const triggerRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<HTMLVideoElement>(null);
  const transitionRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = transitionRef.current;
    if (!video) return;

    const syncMetadata = () => {
      const clipDuration = video.duration;
      video.pause();
      video.currentTime = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? scrollProgressToTime(1, clipDuration)
        : 0;
      setDuration(clipDuration);
    };

    if (video.readyState >= 1) {
      syncMetadata();
      return;
    }

    video.addEventListener("loadedmetadata", syncMetadata, { once: true });
    return () => video.removeEventListener("loadedmetadata", syncMetadata);
  }, []);

  useEffect(() => {
    const trigger = triggerRef.current;
    const pin = pinRef.current;
    const island = islandRef.current;
    const transition = transitionRef.current;
    const content = contentRef.current;
    if (!trigger || !pin || !island || !transition || !content || duration <= 0) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    transition.pause();

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const seeker = createRafVideoSeeker(transition);
      const applyProgress = (progress: number) => {
        const transitionMix = Math.min(1, progress / 0.03);
        const copyExit = Math.min(1, progress / 0.1);

        seeker.seek(scrollProgressToTime(progress, duration));
        gsap.set(island, { opacity: 1 - transitionMix });
        gsap.set(transition, { opacity: transitionMix });
        gsap.set(content, {
          opacity: 1 - copyExit,
          y: -18 * copyExit,
        });
      };

      const context = gsap.context(() => {
        ScrollTrigger.create({
          trigger,
          start: "top top",
          end: () => `+=${window.innerHeight * 3.5}`,
          pin,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: (self) => applyProgress(self.progress),
          onUpdate: (self) => applyProgress(self.progress),
        });
      }, trigger);

      applyProgress(0);
      ScrollTrigger.refresh();

      return () => {
        seeker.cancel();
        context.revert();
      };
    });

    return () => media.revert();
  }, [duration]);

  return (
    <section
      ref={triggerRef}
      className="welcome-dive-sequence"
      aria-labelledby="welcome-title"
    >
      <div ref={pinRef} className="welcome-dive-pin">
        <video
          ref={islandRef}
          className="welcome-dive-island"
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

        <video
          ref={transitionRef}
          className="welcome-dive-transition"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/images/underwater/transition-scrub.mp4" type="video/mp4" />
          <source src="/images/underwater/transition.mp4" type="video/mp4" />
        </video>

        <div className="welcome-shade" aria-hidden="true" />

        <div ref={contentRef} className="welcome-dive-content">
          <div className="welcome-copy">
            <h1 id="welcome-title" aria-label={eventDetails.title}>
              <span>Liliana’s</span>
              <span>First Birthday</span>
            </h1>
            <p>{eventDetails.invitationMessage}</p>
          </div>
          <div className="welcome-scroll-cue" aria-hidden="true">
            <span>Scroll to dive</span>
            <i />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Connect the unified sequence and remove obsolete components**

Change the invitation imports and markup in `components/invitation/InvitationJourney.tsx` to:

```tsx
import { UnderwaterScene } from "@/components/underwater/UnderwaterScene";
import { WelcomeDiveSequence } from "./WelcomeDiveSequence";
```

```tsx
return (
  <main className="invitation-journey">
    <WelcomeDiveSequence />
    <UnderwaterScene />
  </main>
);
```

Delete:

```text
components/invitation/WelcomeScene.tsx
components/invitation/ScrollDiveTransition.tsx
```

- [ ] **Step 5: Replace the two-section CSS with one stacked media stage**

Replace the existing welcome and scroll-dive structural rules in `app/globals.css` with:

```css
.welcome-dive-sequence {
  position: relative;
  width: 100%;
}

.welcome-dive-pin {
  position: relative;
  isolation: isolate;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100vh;
  height: 100svh;
  min-height: 520px;
  overflow: hidden;
  background: #078fbd;
}

.welcome-dive-island,
.welcome-dive-transition {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  pointer-events: none;
}

.welcome-dive-island {
  z-index: -2;
}

.welcome-dive-transition {
  z-index: -1;
  opacity: 0;
}

.welcome-shade {
  position: absolute;
  z-index: 0;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(3, 77, 121, 0.08), rgba(3, 71, 104, 0.02) 45%, rgba(3, 61, 91, 0.28)),
    radial-gradient(circle at 50% 48%, rgba(2, 52, 77, 0.02) 24%, rgba(2, 48, 73, 0.18) 100%);
  pointer-events: none;
}

.welcome-dive-content {
  position: absolute;
  z-index: 1;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  will-change: opacity, transform;
}
```

Keep the existing `.welcome-copy`, `.welcome-scroll-cue`, and typography rules unchanged.

Remove:

```css
.welcome-scene { ... }
.welcome-background,
.transition-video { ... }
.scroll-dive-transition { ... }
.scroll-dive-pin { ... }
.transition-video { ... }

@media (prefers-reduced-motion: reduce) {
  .scroll-dive-transition,
  .scroll-dive-pin { ... }
  .transition-video { ... }
}
```

- [ ] **Step 6: Run focused GREEN checks**

Run:

```powershell
rtk test node --test tests/scroll-video.test.mjs tests/invitation-journey.test.mjs
rtk npm run typecheck
rtk npm run build
rtk test node --test tests/rendered-html.test.mjs
```

Expected: all commands exit successfully.

- [ ] **Step 7: Commit Task 2**

Run:

```powershell
rtk git add -- app/globals.css components/invitation/InvitationJourney.tsx components/invitation/WelcomeDiveSequence.tsx components/invitation/WelcomeScene.tsx components/invitation/ScrollDiveTransition.tsx tests/invitation-journey.test.mjs tests/rendered-html.test.mjs
rtk git commit -m "feat: unify welcome and dive canvas"
```

---

### Task 3: Browser acceptance and final regression gate

**Files:**
- Modify only tracked code or tests implicated by a failure caused by Tasks 1-2.
- Do not stage or modify video assets.

**Interfaces:**
- Consumes: the unified welcome/dive sequence and existing `UnderwaterScene`.
- Produces: evidence that the flow is seamless, reversible, responsive, reduced-motion safe, and free of visible underwater content during the pin.

- [ ] **Step 1: Run the complete automated gate**

Run:

```powershell
rtk npm run test:unit
rtk npm run typecheck
rtk npm run lint
rtk npm run build
rtk test node --test tests/*.test.mjs
rtk git diff --check
```

Expected: all commands exit successfully. Record any pre-existing warning without changing unrelated code.

- [ ] **Step 2: Start the site**

Run:

```powershell
rtk npm run dev
```

Use the reported local URL.

- [ ] **Step 3: Verify desktop single-canvas behavior**

At `1280x720`, verify:

- the island video fills the initial viewport;
- only the approved title, message, and cue are visible;
- the first downward scroll changes that same viewport instead of revealing a second island section;
- copy opacity decreases smoothly and reaches zero by 10% progress;
- the transition video remains pinned for 350vh;
- 0%, 50%, and 100% progress show island, waterline, and underwater frames;
- no underwater scene content paints above the pin;
- the final frame releases directly into `UnderwaterScene`;
- the underwater title remains small and unchanged.

- [ ] **Step 4: Verify reverse and responsive behavior**

Verify:

- upward scrolling from underwater returns to the last transition frame;
- continuing upward moves through the same frames in reverse;
- returning to progress zero restores the island video and welcome copy;
- `390x844` and `844x390` have no horizontal overflow;
- welcome copy and underwater title stay inside safe areas;
- vertical touch-size scrolling is not trapped.

- [ ] **Step 5: Verify reduced motion**

Enable `prefers-reduced-motion: reduce`, reload, and verify:

- Lenis is not initialized;
- no pin spacer is created;
- no continuous transition seek occurs;
- the island welcome scrolls normally into `UnderwaterScene`;
- controls remain usable.

- [ ] **Step 6: Apply only evidence-backed acceptance corrections**

For each discovered defect:

1. Add a focused failing regression test.
2. Run it and record RED.
3. Make the smallest correction.
4. Run focused GREEN and repeat the relevant browser check.
5. Run the complete automated gate again.

If a correction is required, stage only its literal tracked paths and commit:

```powershell
rtk git commit -m "fix: complete single-canvas acceptance"
```

Do not create an empty commit when no correction is needed.

- [ ] **Step 7: Inspect final repository state**

Run:

```powershell
rtk git status --short
rtk git diff --check
rtk git diff --stat
```

Expected: the user's existing video changes and untracked tool directories remain preserved and unstaged.
