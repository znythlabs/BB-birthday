import assert from "node:assert/strict";
import test from "node:test";
import {
  CRAB_PATROL_SPEED,
  JELLYFISH_FLOAT_SPEED,
  TURTLE_PATROL_SPEED,
  advancePatrol,
  crabGroundBounds,
  faceTowardTarget,
  followTarget,
  isNear,
  jellyfishFloatBounds,
  randomCrabWaypoint,
  randomJellyfishWaypoint,
  randomTurtleWaypoint,
  smoothToward,
  turtleSurfaceBounds,
} from "../lib/objectMotion.mjs";

test("smoothToward is frame-rate independent", () => {
  const at60 = Array.from({ length: 60 }, () => null).reduce(
    (point) => smoothToward(point, { x: 100, y: 0 }, 1 / 60, 5),
    { x: 0, y: 0 },
  );
  const at120 = Array.from({ length: 120 }, () => null).reduce(
    (point) => smoothToward(point, { x: 100, y: 0 }, 1 / 120, 5),
    { x: 0, y: 0 },
  );
  assert.ok(Math.abs(at60.x - at120.x) < 0.01);
});

test("faceTowardTarget uses a horizontal deadband", () => {
  assert.equal(faceTowardTarget({ x: 100, y: 0 }, { x: 112, y: 0 }, -1), -1);
  assert.equal(faceTowardTarget({ x: 100, y: 0 }, { x: 121, y: 0 }, -1), 1);
  assert.equal(faceTowardTarget({ x: 100, y: 0 }, { x: 79, y: 0 }, 1), -1);
});

test("fish follows trailing mermaid target by a small fraction", () => {
  assert.deepEqual(
    followTarget({ x: 100, y: 220 }, { x: 300, y: 120 }, 0.05),
    { x: 110, y: 215 },
  );
});

test("turtle waypoints stay above pearl bounds", () => {
  const bounds = turtleSurfaceBounds(1000, 1000);
  assert.deepEqual(bounds, { minX: 200, maxX: 580, minY: 720, maxY: 780 });
  const waypoint = randomTurtleWaypoint(bounds, () => 0.75);
  assert.equal(TURTLE_PATROL_SPEED, 62);
  assert.ok(waypoint.x >= bounds.minX && waypoint.x <= bounds.maxX);
  assert.ok(waypoint.y >= bounds.minY && waypoint.y <= bounds.maxY);
});

test("jellyfish waypoints stay in a slow floating band", () => {
  const bounds = jellyfishFloatBounds(1000, 1000);
  const waypoint = randomJellyfishWaypoint(bounds, () => 0.75);
  assert.equal(JELLYFISH_FLOAT_SPEED, 18);
  assert.ok(waypoint.x >= bounds.minX && waypoint.x <= bounds.maxX);
  assert.ok(waypoint.y >= bounds.minY && waypoint.y <= bounds.maxY);
  const narrow = jellyfishFloatBounds(375, 800);
  assert.ok(narrow.maxX > narrow.minX);
});

test("crab waypoints stay on ground bounds", () => {
  const bounds = crabGroundBounds(1000, 1000);
  assert.deepEqual(bounds, { minX: 680, maxX: 860, y: 920 });
  assert.deepEqual(randomCrabWaypoint(bounds, () => 0.5), { x: 770, y: 920 });
  assert.equal(CRAB_PATROL_SPEED, 42);
});

test("turtle patrol caps distance per frame", () => {
  const next = advancePatrol(
    { x: 200, y: 720 },
    { x: 800, y: 780 },
    TURTLE_PATROL_SPEED,
    1 / 60,
    false,
  );
  assert.ok(Math.hypot(next.x - 200, next.y - 720) <= TURTLE_PATROL_SPEED / 60);
});

test("turtle patrol freezes while mermaid is nearby", () => {
  const current = { x: 320, y: 180 };
  assert.equal(isNear(current, { x: 350, y: 200 }, 40), true);
  assert.deepEqual(
    advancePatrol(current, { x: 500, y: 180 }, TURTLE_PATROL_SPEED, 1 / 60, true),
    current,
  );
});
