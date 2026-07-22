import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_BAND,
  FLEE_ANGLE_JITTER,
  FLEE_BOOST,
  FLEE_MAX_VERTICAL,
  OFFSCREEN_MARGIN,
  SCHOOL_RADIUS_MIN,
  SCHOOL_ZONES,
  avoidanceRadius,
  fleeHeading,
  fleeSpeedBoost,
  isOutsideViewport,
  randomBackgroundWaypoint,
  randomSpawnPoint,
  schoolWaypoint,
  turnToward,
} from "../lib/backgroundFish.mjs";

test("background waypoints stay inside the distant band and scene", () => {
  for (const randomValue of [0, 0.33, 0.66, 0.99]) {
    const waypoint = randomBackgroundWaypoint(1200, 800, () => randomValue);
    assert.ok(waypoint.x >= 0 && waypoint.x <= 1200);
    assert.ok(waypoint.y >= 800 * BACKGROUND_BAND.minY);
    assert.ok(waypoint.y <= 800 * BACKGROUND_BAND.maxY);
  }
});

test("zoned waypoints keep each school inside its own territory", () => {
  for (const zone of SCHOOL_ZONES) {
    for (const randomValue of [0, 0.5, 0.99]) {
      const waypoint = randomBackgroundWaypoint(1200, 800, () => randomValue, zone);
      assert.ok(waypoint.x >= 1200 * zone.minX);
      assert.ok(waypoint.x <= 1200 * zone.maxX);
    }
  }
  assert.ok(SCHOOL_ZONES[0].maxX < SCHOOL_ZONES[1].minX, "zones must not overlap");
});

test("spawn points are fully outside and never enter from the lower edge", () => {
  const edges = [0.05, 0.4, 0.7, 0.95];
  for (const randomValue of edges) {
    const spawn = randomSpawnPoint(1200, 800, OFFSCREEN_MARGIN, () => randomValue);
    const outside =
      spawn.x < 0 || spawn.x > 1200 || spawn.y < 0 || spawn.y > 800;
    assert.ok(outside, `spawn ${JSON.stringify(spawn)} must be outside`);
    assert.ok(spawn.y <= 800 * BACKGROUND_BAND.maxY, "never lower edge");
  }
});

test("flee heading points away from the mermaid within the jitter cone", () => {
  const from = { x: 500, y: 300 };
  const mermaid = { x: 350, y: 320 };
  const away = Math.atan2(from.y - mermaid.y, from.x - mermaid.x);
  for (const randomValue of [0, 0.5, 1]) {
    const heading = fleeHeading(from, mermaid, () => randomValue);
    let delta = Math.abs(heading - away) % (Math.PI * 2);
    if (delta > Math.PI) delta = Math.PI * 2 - delta;
    assert.ok(delta <= FLEE_ANGLE_JITTER + 1e-9);
  }
});

test("flee heading never dives vertically to ground or surface", () => {
  const from = { x: 500, y: 300 };
  for (const mermaid of [
    { x: 500, y: 600 },
    { x: 500, y: 0 },
    { x: 520, y: 700 },
  ]) {
    for (const randomValue of [0, 0.5, 1]) {
      const heading = fleeHeading(from, mermaid, () => randomValue);
      assert.ok(
        Math.abs(Math.sin(heading)) <= Math.sin(FLEE_MAX_VERTICAL) + 1e-9,
        `heading ${heading} too vertical`,
      );
    }
  }
});

test("flee speed boost rises only when the mermaid is very close", () => {
  const radius = 274;
  assert.equal(fleeSpeedBoost(radius, radius), 1);
  assert.equal(fleeSpeedBoost(radius * 0.5, radius), 1);
  assert.equal(fleeSpeedBoost(0, radius), 2);
  assert.equal(1 + FLEE_BOOST, 2);
  const mid = fleeSpeedBoost(radius * 0.25, radius);
  assert.ok(mid > 1 && mid < 1 + FLEE_BOOST);
});

test("school waypoints orbit the leader inside the band", () => {
  const leader = { x: 600, y: 250 };
  for (const randomValue of [0, 0.25, 0.5, 0.75, 0.99]) {
    const waypoint = schoolWaypoint(leader, 1200, 800, () => randomValue);
    const dx = waypoint.x - leader.x;
    const dy = (waypoint.y - leader.y) / 0.75;
    const distance = Math.hypot(dx, dy);
    assert.ok(
      distance >= SCHOOL_RADIUS_MIN - 1e-9,
      `too close to leader: ${distance}`,
    );
    assert.ok(waypoint.y >= 800 * BACKGROUND_BAND.minY);
    assert.ok(waypoint.y <= 800 * BACKGROUND_BAND.maxY);
  }
});

test("turnToward caps the heading change and picks the shortest arc", () => {
  assert.equal(Math.abs(turnToward(0, Math.PI, 0.2)), 0.2);
  const wrapped = turnToward(0.05, Math.PI * 2 - 0.05, 0.2);
  assert.ok(Math.abs(wrapped - -0.05) < 1e-9 || Math.abs(wrapped - (Math.PI * 2 - 0.05)) < 1e-9);
  assert.ok(Math.abs(turnToward(1, 1.05, 0.2) - 1.05) < 1e-9);
});

test("avoidance radius covers the mermaid body before contact", () => {
  assert.equal(avoidanceRadius(380), Math.max(190, 380 * 0.72));
  assert.equal(avoidanceRadius(100), 190);
});

test("viewport exit requires the whole element to leave", () => {
  assert.equal(isOutsideViewport({ x: -30, y: 200 }, 60, 1200, 800), false);
  assert.equal(isOutsideViewport({ x: -61, y: 200 }, 60, 1200, 800), true);
  assert.equal(isOutsideViewport({ x: 600, y: 400 }, 60, 1200, 800), false);
  assert.equal(isOutsideViewport({ x: 600, y: -61 }, 60, 1200, 800), true);
});
