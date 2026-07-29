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

export function createRafVideoSeeker(
  video,
  {
    requestFrame = globalThis.requestAnimationFrame,
    cancelFrame = globalThis.cancelAnimationFrame,
    minDelta = 1 / 120,
  } = {},
) {
  let frameId = null;
  let targetTime = 0;

  const schedule = () => {
    if (frameId === null) {
      frameId = requestFrame(flush);
    }
  };

  const flush = () => {
    frameId = null;

    if (video.seeking) {
      schedule();
      return;
    }

    if (Math.abs(video.currentTime - targetTime) >= minDelta) {
      video.currentTime = targetTime;
    }
  };

  return {
    seek(time) {
      targetTime = Number.isFinite(time) ? Math.max(0, time) : 0;
      schedule();
    },
    cancel() {
      if (frameId !== null) {
        cancelFrame(frameId);
      }
      frameId = null;
    },
  };
}
