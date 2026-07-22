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
