"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type { SpriteClip } from "@/data/spriteCatalog";
import { frameAtTime, sheetPosition } from "@/lib/spriteRuntime.mjs";

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
}: SpriteActorProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      setFrame(0);
      return;
    }

    const startedAt = performance.now();
    let requestId = 0;
    const tick = (now: number) => {
      const nextFrame = frameAtTime(
        now - startedAt,
        clip.fps,
        clip.frames,
        clip.loop,
      );
      setFrame((current) => (current === nextFrame ? current : nextFrame));
      if (clip.loop || nextFrame < clip.frames - 1) {
        requestId = requestAnimationFrame(tick);
      }
    };
    requestId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestId);
  }, [clip.fps, clip.frames, clip.loop, clip.sheet]);

  const frameStyle = useMemo<CSSProperties>(() => {
    const position = sheetPosition(frame, clip.columns, clip.rows);
    return {
      backgroundImage: `url(${clip.sheet})`,
      backgroundPosition: `${position.xPercent}% ${position.yPercent}%`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${clip.columns * 100}% ${clip.rows * 100}%`,
      aspectRatio: `${clip.frameWidth} / ${clip.frameHeight}`,
    };
  }, [clip, frame]);

  const subjectStyle: CSSProperties = {
    ...frameStyle,
    left: x,
    top: y,
    width,
    transform: `translate(-50%, -50%) scaleX(${facing})`,
  };

  return (
    <div className={`sprite-actor-layer ${className}`.trim()} data-frame={frame}>
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
      <span
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="sprite-actor-subject"
        role={label ? "img" : undefined}
        style={subjectStyle}
      />
    </div>
  );
}
