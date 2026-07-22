"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { InteractiveSeaObjectData } from "@/data/seaObjects";
import { mermaidAltitude, projectShadow } from "@/lib/underwaterProjection.mjs";
import { SpriteActor } from "./SpriteActor";

type Point = { x: number; y: number };

const OBJECT_VIDEO_PATHS: Partial<Record<string, string>> = {
  "pearl-shell": "/images/underwater-v2/interactives/pearl-transparent.webm",
  "fish-courier": "/images/underwater-v2/interactives/fish-transparent.webm",
  "sea-turtle": "/images/underwater-v2/interactives/turtle-transparent.webm",
  "treasure-chest": "/images/underwater-v2/interactives/chest-transparent.webm",
  jellyfish: "/images/underwater-v2/interactives/jellyfish-transparent.webm",
  crab: "/images/underwater-v2/interactives/crab-transparent.webm",
};
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
  const videoSrc = OBJECT_VIDEO_PATHS[object.kind];
  const shadowSrc = OBJECT_SHADOW_PATHS[object.kind];
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameHeight = object.width * (432 / 768);
  const globalX = position?.x ?? (object.x / 100) * sceneWidth;
  const globalY = position?.y ?? (object.y / 100) * sceneHeight;
  const altitude = object.grounded
    ? 0
    : object.kind === "sea-turtle"
      ? 0.1
      : object.kind === "fish-courier"
        ? mermaidAltitude(globalY, Math.max(1, sceneHeight))
        : 1;
  const flipped = object.kind === "pearl-shell";
  const visualFacing = flipped ? -1 : facing;
  const projection = projectShadow({
    x: globalX,
    y: globalY,
    sceneWidth: Math.max(1, sceneWidth),
    sceneHeight: Math.max(1, sceneHeight),
    altitude,
    speed: 0,
    facing: visualFacing,
  });
  const groundY =
    object.kind === "fish-courier"
      ? Math.max(projection.groundY, sceneHeight * 0.82)
      : projection.groundY;
  const shadow = {
    ...projection,
    groundX: object.width / 2 + projection.groundX - globalX,
    groundY: frameHeight / 2 + groundY - globalY,
  };
  const style = {
    left: sceneWidth ? `${(globalX / sceneWidth) * 100}%` : `${object.x}%`,
    top: sceneHeight ? `${(globalY / sceneHeight) * 100}%` : `${object.y}%`,
    "--object-width": `${object.width}px`,
  } as CSSProperties;

  useEffect(() => {
    if (!videoSrc) return;
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
  }, [videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    if (reducedMotion) video.pause();
    else void video.play().catch(() => undefined);
  }, [reducedMotion, videoSrc]);

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
      <SpriteActor
        clip={object.clip}
        facing={visualFacing}
        playing={object.clip.loop || active}
        renderSubject={!videoSrc}
        className={
          object.kind === "sea-turtle" ? "sprite-actor-shadow-back" : ""
        }
        shadow={shadowSrc ? false : shadow}
        width={object.width}
        x={object.width / 2}
        y={frameHeight / 2}
      />
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
            preload="auto"
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
