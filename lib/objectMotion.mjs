export const TURTLE_PATROL_SPEED = 62;
export const CRAB_PATROL_SPEED = 42;
export const JELLYFISH_FLOAT_SPEED = 18;

export const jellyfishFloatBounds = (width, height) => {
  const padding = Math.min(120, width * 0.12);
  const minX = Math.max(padding, width * 0.68);
  const maxX = Math.max(minX + 1, Math.min(width - padding, width * 0.9));
  return {
    minX,
    maxX,
    minY: height * 0.3,
    maxY: height * 0.52,
  };
};

export const turtleSurfaceBounds = (width, height) => ({
  minX: Math.max(120, width * 0.2),
  maxX: Math.min(width - 120, width * 0.58),
  minY: height * 0.72,
  maxY: height * 0.78,
});

export const crabGroundBounds = (width, height) => ({
  minX: Math.max(140, width * 0.68),
  maxX: Math.min(width - 140, width * 0.9),
  y: height * 0.92,
});

export const followTarget = (current, target, amount) => ({
  x: current.x + (target.x - current.x) * amount,
  y: current.y + (target.y - current.y) * amount,
});
export const smoothToward = (current, target, deltaSeconds, rate) =>
  followTarget(current, target, 1 - Math.exp(-rate * Math.max(0, deltaSeconds)));

export const faceTowardTarget = (current, target, facing, threshold = 20) => {
  const dx = target.x - current.x;
  if (dx > threshold) return 1;
  if (dx < -threshold) return -1;
  return facing;
};

export const isNear = (first, second, radius) =>
  Math.hypot(first.x - second.x, first.y - second.y) <= radius;

export const randomTurtleWaypoint = (bounds, random = Math.random) => ({
  x: bounds.minX + (bounds.maxX - bounds.minX) * random(),
  y: bounds.minY + (bounds.maxY - bounds.minY) * random(),
});

export const randomJellyfishWaypoint = (bounds, random = Math.random) => ({
  x: bounds.minX + (bounds.maxX - bounds.minX) * random(),
  y: bounds.minY + (bounds.maxY - bounds.minY) * random(),
});

export const randomCrabWaypoint = (bounds, random = Math.random) => ({
  x: bounds.minX + (bounds.maxX - bounds.minX) * random(),
  y: bounds.y,
});

export const advancePatrol = (current, target, maxSpeed, deltaSeconds, stopped) => {
  if (stopped) return current;
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return current;
  const arrivalFactor = Math.min(1, distance / 90);
  const step = Math.min(distance, maxSpeed * Math.max(0, deltaSeconds) * Math.max(0.35, arrivalFactor));
  return {
    x: current.x + (dx / distance) * step,
    y: current.y + (dy / distance) * step,
  };
};
