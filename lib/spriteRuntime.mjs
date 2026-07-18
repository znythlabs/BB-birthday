export function frameAtTime(elapsedMs, fps, frames, loop) {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError("fps must be greater than zero");
  }
  if (!Number.isInteger(frames) || frames <= 0) {
    throw new RangeError("frames must be a positive integer");
  }
  const raw = Math.floor(Math.max(0, elapsedMs) / (1000 / fps));
  return loop ? raw % frames : Math.min(raw, frames - 1);
}

export function sheetPosition(frame, columns, rows) {
  if (!Number.isInteger(columns) || columns <= 0) {
    throw new RangeError("columns must be a positive integer");
  }
  if (!Number.isInteger(rows) || rows <= 0) {
    throw new RangeError("rows must be a positive integer");
  }
  if (!Number.isInteger(frame) || frame < 0 || frame >= columns * rows) {
    throw new RangeError("frame is outside the sprite sheet");
  }
  const column = frame % columns;
  const row = Math.floor(frame / columns);
  return {
    column,
    row,
    xPercent: columns === 1 ? 0 : (column / (columns - 1)) * 100,
    yPercent: rows === 1 ? 0 : (row / (rows - 1)) * 100,
  };
}
