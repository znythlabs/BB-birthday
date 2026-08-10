import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("iPhone uses manual rotation while iPad may request page fullscreen", async () => {
  const source = await readFile(new URL("../lib/mobileFullscreen.ts", import.meta.url), "utf8");
  assert.match(source, /export function isIphoneLike/);
  assert.match(source, /export function isIpad/);
  assert.match(source, /if \(isIphoneLike\(\)\)/);
  assert.doesNotMatch(source, /if \(isIos\(\)\)[\s\S]{0,120}return/);
});

test("iOS sea objects use transparent poster fallback instead of VP9 blending", async () => {
  const objectSource = await readFile(new URL("../components/underwater/InteractiveSeaObject.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(objectSource, /setUseIosPoster\(isIos\(\)\)/);
  assert.match(objectSource, /src=\{object\.posterSrc\}/);
  assert.doesNotMatch(css, /ios-device[\s\S]{0,120}mix-blend-mode:\s*screen/);
});

test("portrait rotation prompts are not hidden after underwater commit", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const welcome = await readFile(new URL("../components/invitation/WelcomeDiveSequence.tsx", import.meta.url), "utf8");
  assert.match(css, /orientation:\s*portrait[\s\S]{0,180}welcome-rotate-prompt/);
  assert.doesNotMatch(css, /data-underwater-committed[^\n]*rotate-device-prompt/);
  assert.match(welcome, /needsManualRotation/);
  assert.match(welcome, /Rotate your iPhone/);
});
