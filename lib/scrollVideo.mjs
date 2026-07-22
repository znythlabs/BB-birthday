export function scrollProgressToTime(progress, duration, endPadding = 1 / 30) {
  const safeProgress = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const safePadding = Number.isFinite(endPadding)
    ? Math.min(safeDuration, Math.max(0, endPadding))
    : 0;

  return safeProgress * Math.max(0, safeDuration - safePadding);
}
