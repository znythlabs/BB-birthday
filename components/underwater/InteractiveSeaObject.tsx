"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { InteractiveSeaObjectData } from "@/data/seaObjects";
import { isIos } from "@/lib/mobileFullscreen";

type Point = { x: number; y: number };

const MOBILE_VIDEO_PATHS: Partial<Record<string, string>> = {
  "pearl-shell": "/images/mobile/pearl-transparent-mobile.webm",
  "fish-courier": "/images/mobile/fish-transparent-mobile.webm",
  "sea-turtle": "/images/mobile/turtle-transparent-mobile.webm",
  "treasure-chest": "/images/mobile/chest-transparent-mobile.webm",
  jellyfish: "/images/mobile/jellyfish-transparent-mobile.webm",
  crab: "/images/mobile/crab-transparent-mobile.webm",
};

const IOS_ANIMATED_WEBP_PATHS: Partial<Record<string, string>> = {
  "pearl-shell": "/images/mobile/pearl-transparent-ios.webp",
  "fish-courier": "/images/mobile/fish-transparent-ios.webp",
  "sea-turtle": "/images/mobile/turtle-transparent-ios.webp",
  "treasure-chest": "/images/mobile/chest-transparent-ios.webp",
  jellyfish: "/images/mobile/jellyfish-transparent-ios.webp",
  crab: "/images/mobile/crab-transparent-ios.webp",
};

const IOS_HEVC_ALPHA_PATHS: Partial<Record<string, string>> = {
  "pearl-shell": "/images/mobile/hevc/pearl-transparent-ios.mov",
  "fish-courier": "/images/mobile/hevc/fish-transparent-ios.mov",
  "sea-turtle": "/images/mobile/hevc/turtle-transparent-ios.mov",
  "treasure-chest": "/images/mobile/hevc/chest-transparent-ios.mov",
  jellyfish: "/images/mobile/hevc/jellyfish-transparent-ios.mov",
  crab: "/images/mobile/hevc/crab-transparent-ios.mov",
};

const MOBILE_SHADOW_PATHS: Partial<Record<string, string>> = {
  "pearl-shell": "/images/mobile/pearl_shadow-mobile.webp",
  "treasure-chest": "/images/mobile/chest_shadow-mobile.webp",
  crab: "/images/mobile/crab_shadow-mobile.webp",
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
  const videoSrc = object.videoSrc;
  const mobileVideoSrc = MOBILE_VIDEO_PATHS[object.kind];
  const iosAnimatedWebpSrc = IOS_ANIMATED_WEBP_PATHS[object.kind];
  const iosHevcCandidate = IOS_HEVC_ALPHA_PATHS[object.kind];
  const shadowSrc = OBJECT_SHADOW_PATHS[object.kind];
  const mobileShadowSrc = MOBILE_SHADOW_PATHS[object.kind];
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isIosDevice, setIsIosDevice] = useState<boolean | null>(null);
  const [iosHevcSrc, setIosHevcSrc] = useState<string | null>(null);
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
  // Keep grounded chest/crab fully inside the scene on desktop too — the
  // element overflows downward (negative margin-top), so clamp the top so the
  // visual bottom edge never crosses the scene bottom and gets clipped.
  const desktopTop =
    !isMobile && sceneHeight && isGroundedChestCrab
      ? Math.min(globalY, sceneHeight - 2 - object.width * 0.28125)
      : globalY;
  const style = {
    left: isMobile ? 0 : sceneWidth ? `${(globalX / sceneWidth) * 100}%` : `${object.x}%`,
    top: isMobile ? 0 : sceneHeight ? `${(desktopTop / sceneHeight) * 100}%` : `${object.y}%`,
    ...(isMobile ? { transform: `translate3d(${globalX}px, ${mobileY}px, 0)` } : {}),
    "--object-width": `${object.width}px`,
  } as CSSProperties;

  useEffect(() => {
    const iosFrame = requestAnimationFrame(() => setIsIosDevice(isIos()));
    const query = window.matchMedia("(max-width: 1200px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(iosFrame);
      query.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!isIosDevice || !iosHevcCandidate) return;
    const probe = document.createElement("video");
    const canPlayHevc =
      probe.canPlayType('video/mp4; codecs="hvc1"') ||
      probe.canPlayType('video/quicktime; codecs="hvc1"');
    if (!canPlayHevc) return;

    let cancelled = false;
    void fetch(iosHevcCandidate, { method: "HEAD", cache: "force-cache" })
      .then((response) => {
        if (!cancelled && response.ok) setIosHevcSrc(iosHevcCandidate);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [iosHevcCandidate, isIosDevice]);

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
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") onActivate(object);
      }}
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
          {isIosDevice === null ? (
            <img
              className="sea-object-video sea-object-ios-bootstrap"
              src={object.posterSrc}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{ transform: `scaleX(${visualFacing})` }}
            />
          ) : isIosDevice ? (
            iosHevcSrc && !reducedMotion ? (
              <video
                ref={videoRef}
                className="sea-object-video"
                src={iosHevcSrc}
                style={{ transform: `scaleX(${visualFacing})` }}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                tabIndex={-1}
                aria-hidden="true"
                onError={() => setIosHevcSrc(null)}
              />
            ) : (
              <img
                className="sea-object-video sea-object-ios-animated"
                src={reducedMotion ? object.posterSrc : (iosAnimatedWebpSrc ?? object.posterSrc)}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ transform: `scaleX(${visualFacing})` }}
              />
            )
          ) : (
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
              {mobileVideoSrc ? (
                <source media="(max-width: 1200px)" src={mobileVideoSrc} type="video/webm" />
              ) : null}
              <source src={videoSrc} type="video/webm" />
            </video>
          )}
        </span>
      ) : null}
      <span className="sea-object-discovery" aria-hidden="true">
        Discover
      </span>
    </button>
  );
}
