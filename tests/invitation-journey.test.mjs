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
