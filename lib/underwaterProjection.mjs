const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));
const mix = (from, to, amount) => from + (to - from) * amount;

export function mermaidAltitude(y, sceneHeight) {
  if (!Number.isFinite(sceneHeight) || sceneHeight <= 0) {
    throw new RangeError("sceneHeight must be greater than zero");
  }
  return clamp((sceneHeight * 0.78 - y) / (sceneHeight * 0.55), 0, 1);
}

export function projectShadow({
  x,
  y,
  sceneWidth,
  sceneHeight,
  altitude,
  speed,
  facing,
}) {
  if (!Number.isFinite(sceneWidth) || sceneWidth <= 0) {
    throw new RangeError("sceneWidth must be greater than zero");
  }
  if (!Number.isFinite(sceneHeight) || sceneHeight <= 0) {
    throw new RangeError("sceneHeight must be greater than zero");
  }
  const normalizedAltitude = clamp(altitude, 0, 1);
  const direction = facing < 0 ? -1 : 1;
  return {
    groundX: x + (sceneWidth * 0.5 - x) * 0.05 * normalizedAltitude,
    groundY: clamp(
      y + sceneHeight * mix(0.07, 0.23, normalizedAltitude),
      sceneHeight * 0.56,
      sceneHeight * 0.93,
    ),
    opacity: mix(0.36, 0.08, normalizedAltitude),
    blurPx: mix(3, 20, normalizedAltitude),
    scaleX:
      (1 + clamp(Math.max(0, speed) / 1400, 0, 0.22)) * direction,
    scaleY: mix(0.28, 0.12, normalizedAltitude),
    skewXDeg: direction * mix(-8, -3, normalizedAltitude),
  };
}
