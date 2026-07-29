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
  const video = { currentTime: 0, seeking: false };
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

test("waits for an active decoder seek and then applies the latest target", () => {
  const video = { currentTime: 1, seeking: true };
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

  seeker.seek(3);
  callbacks.get(1)();
  seeker.seek(5);

  assert.equal(video.currentTime, 1);
  assert.equal(requests, 2);

  video.seeking = false;
  callbacks.get(2)();
  assert.equal(video.currentTime, 5);
});

test("skips immaterial seeks and cancels a pending frame", () => {
  const video = { currentTime: 4, seeking: false };
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
