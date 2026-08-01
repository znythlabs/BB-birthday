"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type { SpriteClip } from "@/data/spriteCatalog";
import {
  frameAtTime,
  frameForClip,
  sheetPosition,
} from "@/lib/spriteRuntime.mjs";

export type SpriteProjection = {
  groundX: number;
  groundY: number;
  opacity: number;
  blurPx: number;
  scaleX: number;
  scaleY: number;
  skewXDeg: number;
};

type SpriteActorProps = {
  clip: SpriteClip;
  x: number;
  y: number;
  width: number;
  facing?: 1 | -1;
  label?: string;
  className?: string;
  shadow?: SpriteProjection | false;
  renderSubject?: boolean;
  playing?: boolean;
};

export function SpriteActor({
  clip,
  x,
  y,
  width,
  facing = 1,
  label,
  className = "",
  shadow = false,
  renderSubject = true,
  playing = true,
}: SpriteActorProps) {
  const [clock, setClock] = useState(() => ({ frame: 0, sheet: clip.sheet }));

  useEffect(() => {
    if (!playing) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      const requestId = requestAnimationFrame(() =>
        setClock({ frame: 0, sheet: clip.sheet }),
      );
      return () => cancelAnimationFrame(requestId);
    }

    const startedAt = performance.now();
    let requestId = 0;
    let timeoutId: number | null = null;
    const frameDelay = 1000 / clip.fps;
    const tick = (now: number) => {
      const nextFrame = frameAtTime(
        now - startedAt,
        clip.fps,
        clip.frames,
        clip.loop,
      );
      setClock((current) =>
        current.sheet === clip.sheet && current.frame === nextFrame
          ? current
          : { frame: nextFrame, sheet: clip.sheet },
      );
      if (clip.loop || nextFrame < clip.frames - 1) {
        timeoutId = window.setTimeout(() => {
          requestId = requestAnimationFrame(tick);
        }, frameDelay);
      }
    };
    requestId = requestAnimationFrame(tick);
    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [clip.fps, clip.frames, clip.loop, clip.sheet, playing]);

  const displayedFrame = frameForClip(clock, clip, playing);
  const frameStyle = useMemo<CSSProperties>(() => {
    const position = sheetPosition(displayedFrame, clip.columns, clip.rows);
    return {
      backgroundImage: `url(${clip.sheet})`,
      backgroundPosition: `${position.xPercent}% ${position.yPercent}%`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${clip.columns * 100}% ${clip.rows * 100}%`,
      aspectRatio: `${clip.frameWidth} / ${clip.frameHeight}`,
    };
  }, [clip, displayedFrame]);

  const subjectStyle: CSSProperties = {
    ...frameStyle,
    left: x,
    top: y,
    width,
    transform: `translate(-50%, -50%) scaleX(${facing})`,
  };

  return (
    <div
      className={`sprite-actor-layer ${className}`.trim()}
      data-frame={displayedFrame}
    >
      {shadow ? (
        <span
          aria-hidden="true"
          className="sprite-actor-shadow"
          style={{
            ...frameStyle,
            left: shadow.groundX,
            top: shadow.groundY,
            width,
            opacity: shadow.opacity,
            filter: `brightness(0) saturate(100%) invert(19%) sepia(30%) saturate(1150%) hue-rotate(144deg) brightness(68%) blur(${shadow.blurPx}px)`,
            transform: `translate(-50%, -50%) scaleX(${shadow.scaleX}) scaleY(${shadow.scaleY}) skewX(${shadow.skewXDeg}deg)`,
          }}
        />
      ) : null}
      {renderSubject ? (
        <span
          aria-label={label}
          aria-hidden={label ? undefined : true}
          className="sprite-actor-subject"
          role={label ? "img" : undefined}
          style={subjectStyle}
        />
      ) : null}
    </div>
  );
}
