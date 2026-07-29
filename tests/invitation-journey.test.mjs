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
  assert.doesNotMatch(
    source,
    /UnderwaterScene|MermaidCharacter|InteractiveSeaObject|BackgroundFishSchools|AmbientLayers/,
  );
});

test("unified sequence pins once and directly updates the coalesced playhead", async () => {
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
  assert.match(
    source,
    /video\.addEventListener\("loadedmetadata", syncMetadata, \{ once: true \}\)/,
  );
  assert.match(
    source,
    /video\.removeEventListener\("loadedmetadata", syncMetadata\)/,
  );
});

test("journey owns Lenis and hands the unified sequence directly to underwater", async () => {
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

  const sequenceIndex = source.indexOf("<WelcomeDiveSequence");
  const underwaterIndex = source.indexOf("<UnderwaterScene");
  assert.ok(sequenceIndex >= 0 && sequenceIndex < underwaterIndex);
  assert.doesNotMatch(source, /<WelcomeScene|<ScrollDiveTransition/);
});

test("underwater title keeps the compact verified artwork treatment", async () => {
  const scene = await readFile(
    new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url),
    "utf8",
  );

  assert.match(scene, /className="underwater-title-lockup"/);
  assert.match(scene, /liliana-underwater-title\.png/);
  assert.match(scene, /<h2 className="sr-only">Liliana’s First Birthday<\/h2>/);
  assert.doesNotMatch(scene, /className="title-bubble"/);
});
