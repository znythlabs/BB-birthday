"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { isIos } from "@/lib/mobileFullscreen";

const MERMAID_VIDEO_PATH = "/images/mermaid/mermaid-transparent.webm";
const MERMAID_MOBILE_VIDEO_PATH = "/images/mobile/mermaid-transparent-mobile.webm";
const MERMAID_IOS_ANIMATED_PATH = "/images/mobile/mermaid-transparent-ios.webp";
const MERMAID_IOS_STATIC_PATH = "/images/mobile/mermaid-static-ios.webp";
const MERMAID_IOS_HEVC_PATH = "/images/mobile/hevc/mermaid-transparent-ios.mov";

type MermaidCharacterProps = {
  x: number;
  y: number;
  width: number;
  facing: 1 | -1;
  onVideoElement?: (element: HTMLVideoElement | null) => void;
};

export function MermaidCharacter({
  x,
  y,
  width,
  facing,
  onVideoElement,
}: MermaidCharacterProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isIosDevice, setIsIosDevice] = useState<boolean | null>(null);
  const [iosHevcAvailable, setIosHevcAvailable] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoStyle = {
    left: isMobile ? 0 : x,
    top: isMobile ? 0 : y,
    width,
    transform: isMobile
      ? `translate3d(${x}px, ${y}px, 0) scaleX(${facing})`
      : `translate(-50%, -50%) scaleX(${facing})`,
  } as CSSProperties;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1200px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const ios = isIos();
    const iosFrame = requestAnimationFrame(() => setIsIosDevice(ios));
    if (!ios) return () => cancelAnimationFrame(iosFrame);
    const probe = document.createElement("video");
    const canPlayHevc =
      probe.canPlayType('video/mp4; codecs="hvc1"') ||
      probe.canPlayType('video/quicktime; codecs="hvc1"');
    if (!canPlayHevc) return;
    let cancelled = false;
    void fetch(MERMAID_IOS_HEVC_PATH, { method: "HEAD", cache: "force-cache" })
      .then((response) => {
        if (!cancelled && response.ok) setIosHevcAvailable(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      const reduced = motionQuery.matches;
      setReducedMotion(reduced);
      const video = internalVideoRef.current;
      if (!video) return;
      if (reduced) video.pause();
      else void video.play().catch(() => undefined);
    };

    syncMotion();
    motionQuery.addEventListener("change", syncMotion);
    return () => motionQuery.removeEventListener("change", syncMotion);
  }, []);

  const videoRefCallback = (element: HTMLVideoElement | null) => {
    internalVideoRef.current = element;
    if (element) element.volume = 0; // belt-and-suspenders: never let the
    // video's own audio track play; the laugh comes from Web Audio only.
    onVideoElement?.(element);
  };

  // Desktop / Android: main's structure with the .mermaid-character wrapper
  // (full-scene anchor required so the video keeps its size) and the animated
  // video. iOS gets the animated WebP / HEVC path with a hidden timeline
  // video that keeps the laugh-audio currentTime sync clock running.
  const regularVideo = (
    <video
      ref={videoRefCallback}
      className="mermaid-video"
      style={videoStyle}
      autoPlay={!reducedMotion && isMobile !== null}
      muted
      loop
      playsInline
      preload="auto"
      tabIndex={-1}
      aria-label="Lilianna swimming as a mermaid"
      role="img"
      onLoadedData={(event) => {
        if (reducedMotion || isMobile === null) event.currentTarget.pause();
      }}
    >
      <source media="(max-width: 1200px)" src={MERMAID_MOBILE_VIDEO_PATH} type="video/webm" />
      <source src={MERMAID_VIDEO_PATH} type="video/webm" />
    </video>
  );

  const iosAnimated = (
    <>
      <img
        className="mermaid-video"
        style={videoStyle}
        src={reducedMotion ? MERMAID_IOS_STATIC_PATH : MERMAID_IOS_ANIMATED_PATH}
        alt="Lilianna swimming as a mermaid"
        draggable={false}
      />
      <video
        ref={videoRefCallback}
        className="mermaid-timeline-video"
        src={MERMAID_MOBILE_VIDEO_PATH}
        autoPlay={!reducedMotion}
        muted
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );

  const iosHevc = (
    <video
      ref={videoRefCallback}
      className="mermaid-video"
      style={videoStyle}
      src={MERMAID_IOS_HEVC_PATH}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      tabIndex={-1}
      aria-label="Lilianna swimming as a mermaid"
      role="img"
      onError={() => setIosHevcAvailable(false)}
    />
  );

  return (
    <div className="mermaid-character">
      {isIosDevice === null
        ? regularVideo
        : isIosDevice
          ? iosHevcAvailable && !reducedMotion
            ? iosHevc
            : iosAnimated
          : regularVideo}
    </div>
  );
}
