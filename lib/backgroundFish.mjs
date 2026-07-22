const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export const BACKGROUND_BAND = { minY: 0.12, maxY: 0.5 };
export const CRUISE_SPEED = 26;
export const REGROUP_SPEED = 78;
export const FLEE_SPEED = 520;
export const FLEE_RAMP_RATE = 6;
export const FLEE_BOOST = 1.0;
export const FLEE_MAX_VERTICAL = 0.78;
export const TURN_RATE = 1.5;
export const OFFSCREEN_MARGIN = 140;
export const FLEE_ANGLE_JITTER = 0.38;
export const GROUP_SEPARATION = 80;
export const SCHOOL_RADIUS_MIN = 70;
export const SCHOOL_RADIUS_MAX = 110;

export const avoidanceRadius = (mermaidWidth) =>
  Math.max(190, mermaidWidth * 0.72);

export const fleeSpeedBoost = (distance, radius) =>
  1 + clamp((radius * 0.5 - distance) / (radius * 0.5), 0, 1) * FLEE_BOOST;

export const schoolWaypoint = (leader, width, height, random = Math.random) => {
  const angle = random() * Math.PI * 2;
  const radius =
    SCHOOL_RADIUS_MIN + random() * (SCHOOL_RADIUS_MAX - SCHOOL_RADIUS_MIN);
  return {
    x: clamp(
      leader.x + Math.cos(angle) * radius,
      width * 0.05,
      width * 0.95,
    ),
    y: clamp(
      leader.y + Math.sin(angle) * radius * 0.75,
      height * BACKGROUND_BAND.minY,
      height * BACKGROUND_BAND.maxY,
    ),
  };
};

export const SCHOOL_ZONES = [
  { minX: 0.06, maxX: 0.46 },
  { minX: 0.54, maxX: 0.94 },
];

export const randomBackgroundWaypoint = (
  width,
  height,
  random = Math.random,
  xRange = { minX: 0.08, maxX: 0.92 },
) => ({
  x: width * (xRange.minX + (xRange.maxX - xRange.minX) * random()),
  y:
    height *
    (BACKGROUND_BAND.minY + (BACKGROUND_BAND.maxY - BACKGROUND_BAND.minY) * random()),
});

export const randomSpawnPoint = (
  width,
  height,
  margin = OFFSCREEN_MARGIN,
  random = Math.random,
) => {
  const edge = Math.min(2, Math.floor(random() * 3));
  const y =
    height *
    (BACKGROUND_BAND.minY + (BACKGROUND_BAND.maxY - BACKGROUND_BAND.minY) * random());
  if (edge === 0) return { x: -margin, y };
  if (edge === 1) return { x: width + margin, y };
  return { x: width * (0.08 + 0.84 * random()), y: -margin };
};

export const fleeHeading = (from, mermaid, random = Math.random) => {
  const base =
    Math.atan2(from.y - mermaid.y, from.x - mermaid.x) +
    (random() * 2 - 1) * FLEE_ANGLE_JITTER;
  const maxDy = Math.sin(FLEE_MAX_VERTICAL);
  let dx = Math.cos(base);
  let dy = Math.sin(base);
  if (Math.abs(dy) > maxDy) {
    dy = Math.sign(dy) * maxDy;
    dx = (dx === 0 ? 1 : Math.sign(dx)) * Math.sqrt(1 - dy * dy);
  }
  return Math.atan2(dy, dx);
};

export const turnToward = (heading, target, maxTurn) => {
  const delta = ((target - heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return heading + clamp(delta, -maxTurn, maxTurn);
};

export const isOutsideViewport = (point, halfExtent, width, height) =>
  point.x + halfExtent < 0 ||
  point.x - halfExtent > width ||
  point.y + halfExtent < 0 ||
  point.y - halfExtent > height;
