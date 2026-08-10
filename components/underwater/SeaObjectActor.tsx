"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { InteractiveSeaObjectData } from "@/data/seaObjects";

type Point = { x: number; y: number };

const OBJECT_VIDEO_PATHS: Partial<Record<string, string>> = {
  "pearl-shell": "/images/mobile/pearl-transparent-mobile.webm",
  "fish-courier": "/images/mobile/fish-transparent-mobile.webm",
  "sea-turtle": "/images/mobile/turtle-transparent-mobile.webm",
  "treasure-chest": "/images/mobile/chest-transparent-mobile.webm",
  jellyfish: "/images/mobile/jellyfish-transparent-mobile.webm",
  crab: "/images/mobile/crab-transparent-mobile.webm",
};
const OBJECT_SHADOW_PATHS: Partial<Record<string, string>> = {
  "pearl-shell": "/images/underwater-v2/interactives/shadows/pearl_shadow.png",
  "treasure-chest": "/images/underwater-v2/interactives/shadows/chest_shadow.png",
  crab: "/images/underwater-v2/interactives/shadows/crab_shadow.png",
};
const MOBILE_SHADOW_PATHS: Partial<Record<string, string>> = {
  "pearl-shell": "/images/mobile/pearl_shadow-mobile.webp",
  "treasure-chest": "/images/mobile/chest_shadow-mobile.webp",
  crab: "/images/mobile/crab_shadow-mobile.webp",
};

type Props = {
  object: InteractiveSeaObjectData;
  active: boolean;
  sceneWidth: number;
  sceneHeight: number;
  position?: Point;
  facing?: 1 | -1;
  onActivate: (object: InteractiveSeaObjectData) => void;
  elementRef?: (element: HTMLButtonElement | null) => void;
};

export function InteractiveSeaObject({
  object,
  active,
  sceneWidth,
  sceneHeight,
  position,
  facing = 1,
  onActivate,
  elementRef,
}: Props) {
  const videoSrc = object.videoSrc;
  const mobileVideoSrc = OBJECT_VIDEO_PATHS[object.kind];
  const shadowSrc = OBJECT_SHADOW_PATHS[object.kind];
  const mobileShadowSrc = MOBILE_SHADOW_PATHS[object.kind];
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const globalX = position?.x ?? (object.x / 100) * sceneWidth;
  const globalY = position?.y ?? (object.y / 100) * sceneHeight;
  // Mobile: grounded chest/crab sit on the seabed — bottom edge within a few px of the scene bottom.
  const isGroundedChestCrab =
    object.grounded && (object.kind === "treasure-chest" || object.kind === "crab");
  const mobileY =
    isMobile && sceneHeight
      ? isGroundedChestCrab
        ? sceneHeight - 2 - object.width * 0.58 * 0.28125
        : Math.min(globalY, sceneHeight - 6 - object.width * 0.58 * 0.5625)
      : globalY;
  const visualFacing = object.kind === "pearl-shell" ? -1 : facing;
  const style = {
    left: isMobile ? 0 : sceneWidth ? `${(globalX / sceneWidth) * 100}%` : `${object.x}%`,
    top: isMobile ? 0 : sceneHeight ? `${(globalY / sceneHeight) * 100}%` : `${object.y}%`,
    ...(isMobile ? { transform: `translate3d(${globalX}px, ${mobileY}px, 0)` } : {}),
    "--object-width": `${object.width}px`,
  } as CSSProperties;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1200px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

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
    if (reducedMotion || isMobile === null || document.hidden) {
      video.pause();
    } else {
      void video.play().catch(() => undefined);
    }
  }, [active, isMobile, reducedMotion]);

  return (
    <button
      ref={elementRef}
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
        <picture className="sea-object-dedicated-shadow">
          {mobileShadowSrc ? (
            <source media="(max-width: 1200px)" srcSet={mobileShadowSrc} type="image/webp" />
          ) : null}
          <img
            src={shadowSrc}
            alt=""
            aria-hidden="true"
            style={{ transform: `scaleX(${visualFacing})` }}
          />
        </picture>
      ) : null}
      {videoSrc ? (
        <span className="sea-object-media">
          <video
            ref={videoRef}
            className="sea-object-video"
            style={{ transform: `scaleX(${visualFacing})` }}
            autoPlay={!reducedMotion && isMobile !== null}
            muted
            loop
            playsInline
            preload="metadata"
            tabIndex={-1}
            aria-hidden="true"
            onLoadedData={(event) => {
              if (reducedMotion || isMobile === null) event.currentTarget.pause();
            }}
          >
            {mobileVideoSrc ? (
              <source
                media="(max-width: 1200px)"
                src={mobileVideoSrc}
                type="video/webm"
              />
            ) : null}
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
