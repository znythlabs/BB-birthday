import assert from "node:assert/strict";
import test from "node:test";

import { frameAtTime, sheetPosition } from "../lib/spriteRuntime.mjs";


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

test("runtime helpers reject invalid clip geometry", () => {
  assert.throws(() => frameAtTime(0, 0, 8, true), /fps/);
  assert.throws(() => frameAtTime(0, 8, 0, true), /frames/);
  assert.throws(() => sheetPosition(0, 0, 2), /columns/);
  assert.throws(() => sheetPosition(8, 4, 2), /outside/);
});
