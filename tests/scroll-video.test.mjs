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
