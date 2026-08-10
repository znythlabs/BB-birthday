"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { isIos } from "@/lib/mobileFullscreen";

const MERMAID_VIDEO_PATH = "/images/mermaid/mermaid-transparent.webm";
const MERMAID_MOBILE_VIDEO_PATH = "/images/mobile/mermaid-transparent-mobile.webm";
const MERMAID_IOS_POSTER = "/images/underwater-v2/interactives/frames/keyed/mermaid-key.webp";

type MermaidCharacterProps = {
  x: number;
  y: number;
  width: number;
  facing: 1 | -1;
  videoRef?: React.Ref<HTMLVideoElement>;
};

export function MermaidCharacter({
  x,
  y,
  width,
  facing,
  videoRef,
}: MermaidCharacterProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [useIosPoster, setUseIosPoster] = useState(false);
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
    setUseIosPoster(isIos());
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

  return (
    <div className={"mermaid-character" + (useIosPoster ? " ios-keyed" : "")}>
      <video
        ref={(element) => {
          internalVideoRef.current = element;
          if (element) element.volume = 0; // belt-and-suspenders: never let the
          // video's own audio track play; the laugh comes from Web Audio only.
          if (typeof videoRef === "function") videoRef(element);
          else if (videoRef) videoRef.current = element;
        }}
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
      {useIosPoster ? (
        <img
          className="mermaid-video mermaid-ios-poster"
          src={MERMAID_IOS_POSTER}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={videoStyle}
        />
      ) : null}
    </div>
  );
}
