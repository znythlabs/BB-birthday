"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { InteractiveSeaObjectData } from "@/data/seaObjects";

type Point = { x: number; y: number };

const OBJECT_SHADOW_PATHS: Partial<Record<string, string>> = {
  "pearl-shell": "/images/underwater-v2/interactives/shadows/pearl_shadow.png",
  "treasure-chest": "/images/underwater-v2/interactives/shadows/chest_shadow.png",
  crab: "/images/underwater-v2/interactives/shadows/crab_shadow.png",
};

type Props = {
  object: InteractiveSeaObjectData;
  active: boolean;
  sceneWidth: number;
  sceneHeight: number;
  position?: Point;
  facing?: 1 | -1;
  onActivate: (object: InteractiveSeaObjectData) => void;
};

export function InteractiveSeaObject({
  object,
  active,
  sceneWidth,
  sceneHeight,
  position,
  facing = 1,
  onActivate,
}: Props) {
  const videoSrc = object.videoSrc;
  const shadowSrc = OBJECT_SHADOW_PATHS[object.kind];
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const globalX = position?.x ?? (object.x / 100) * sceneWidth;
  const globalY = position?.y ?? (object.y / 100) * sceneHeight;
  const visualFacing = object.kind === "pearl-shell" ? -1 : facing;
  const style = {
    left: sceneWidth ? `${(globalX / sceneWidth) * 100}%` : `${object.x}%`,
    top: sceneHeight ? `${(globalY / sceneHeight) * 100}%` : `${object.y}%`,
    "--object-width": `${object.width}px`,
  } as CSSProperties;

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      const reduced = motionQuery.matches;
      setReducedMotion(reduced);
      const video = videoRef.current;
      if (!video) return;
      if (reduced) video.pause();
      else void video.play().catch(() => undefined);
    };
    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);
    return () => motionQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reducedMotion) video.pause();
    else void video.play().catch(() => undefined);
  }, [reducedMotion]);

  return (
    <button
      type="button"
      className={`sea-object sea-object-${object.kind}`}
      style={style}
      aria-label={`${object.hint}: ${object.value}`}
      aria-expanded={active}
      aria-controls={active ? "active-party-detail" : undefined}
      data-active={active || undefined}
      onClick={() => onActivate(object)}
    >
      <span className="sea-object-glow" aria-hidden="true" />
      {shadowSrc ? (
        <img
          className="sea-object-dedicated-shadow"
          src={shadowSrc}
          alt=""
          aria-hidden="true"
          style={{ transform: `scaleX(${visualFacing})` }}
        />
      ) : null}
      {videoSrc ? (
        <span className="sea-object-media">
          <video
            ref={videoRef}
            className="sea-object-video"
            style={{ transform: `scaleX(${visualFacing})` }}
            autoPlay={!reducedMotion}
            muted
            loop
            playsInline
            preload="metadata"
            tabIndex={-1}
            aria-hidden="true"
            onLoadedData={(event) => {
              if (reducedMotion) event.currentTarget.pause();
            }}
          >
            <source src={videoSrc} type="video/webm" />
          </video>
        </span>
      ) : null}
      <span className="sea-object-discovery" aria-hidden="true">
        Discover
      </span>
    </button>
  );
}
