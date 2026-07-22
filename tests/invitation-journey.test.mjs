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
