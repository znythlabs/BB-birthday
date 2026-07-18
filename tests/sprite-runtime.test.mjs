import assert from "node:assert/strict";
import test from "node:test";

import {
  frameAtTime,
  frameForClip,
  sheetPosition,
} from "../lib/spriteRuntime.mjs";
import { mermaidAltitude, projectShadow } from "../lib/underwaterProjection.mjs";


test("frameAtTime loops or clamps deterministically", () => {
  assert.equal(frameAtTime(500, 12, 12, true), 6);
  assert.equal(frameAtTime(5000, 8, 8, false), 7);
  assert.equal(frameAtTime(-500, 8, 8, true), 0);
});

test("sheetPosition maps a frame to its exact sheet cell", () => {
  assert.deepEqual(sheetPosition(6, 4, 3), {
    column: 2,
    row: 1,
    xPercent: 66.66666666666666,
    yPercent: 50,
  });
});

test("a frame from the previous clip resets before sheet lookup", () => {
  const staleSwimClock = { frame: 11, sheet: "/mermaid/swim.png" };
  const idleClip = { frames: 8, sheet: "/mermaid/idle.png" };

  const frame = frameForClip(staleSwimClock, idleClip, true);

  assert.equal(frame, 0);
  assert.doesNotThrow(() => sheetPosition(frame, 4, 2));
  assert.equal(
    frameForClip({ frame: 6, sheet: idleClip.sheet }, idleClip, true),
    6,
  );
  assert.equal(
    frameForClip({ frame: 6, sheet: idleClip.sheet }, idleClip, false),
    0,
  );
});

test("runtime helpers reject invalid clip geometry", () => {
  assert.throws(() => frameAtTime(0, 0, 8, true), /fps/);
  assert.throws(() => frameAtTime(0, 8, 0, true), /frames/);
  assert.throws(() => sheetPosition(0, 0, 2), /columns/);
  assert.throws(() => sheetPosition(8, 4, 2), /outside/);
});

test("altitude makes the exact-frame seabed projection softer and fainter", () => {
  const near = projectShadow({
    x: 500,
    y: 700,
    sceneWidth: 1000,
    sceneHeight: 900,
    altitude: 0,
    speed: 0,
    facing: 1,
  });
  const high = projectShadow({
    x: 500,
    y: 300,
    sceneWidth: 1000,
    sceneHeight: 900,
    altitude: 0.8,
    speed: 0,
    facing: 1,
  });

  assert.ok(near.opacity > high.opacity);
  assert.ok(near.blurPx < high.blurPx);
  assert.ok(high.groundY > 300);
  assert.equal(mermaidAltitude(702, 900), 0);
  assert.equal(mermaidAltitude(100, 900), 1);
});

test("projection follows facing and stretches modestly with speed", () => {
  const still = projectShadow({
    x: 250,
    y: 500,
    sceneWidth: 1000,
    sceneHeight: 900,
    altitude: 0.4,
    speed: 0,
    facing: -1,
  });
  const moving = projectShadow({
    x: 250,
    y: 500,
    sceneWidth: 1000,
    sceneHeight: 900,
    altitude: 0.4,
    speed: 1400,
    facing: -1,
  });

  assert.ok(still.scaleX < 0);
  assert.ok(Math.abs(moving.scaleX) > Math.abs(still.scaleX));
  assert.ok(moving.skewXDeg > 0);
});
