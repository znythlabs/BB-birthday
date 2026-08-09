"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const MERMAID_VIDEO_PATH = "/images/mermaid/mermaid-transparent.webm";

type MermaidCharacterProps = {
  x: number;
  y: number;
  width: number;
  facing: 1 | -1;
  audioMuted: boolean;
};

export function MermaidCharacter({
  x,
  y,
  width,
  facing,
  audioMuted,
}: MermaidCharacterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoStyle = {
    left: x,
    top: y,
    width,
    transform: `translate(-50%, -50%) scaleX(${facing})`,
  } as CSSProperties;

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      const reduced = motionQuery.matches;
      setReducedMotion(reduced);
      const video = videoRef.current;
      if (!video) return;
      if (reduced) video.pause();
      else void video.play().catch(() => undefined);
    };

    syncMotion();
    motionQuery.addEventListener("change", syncMotion);
    return () => motionQuery.removeEventListener("change", syncMotion);
  }, []);

  return (
    <video
      ref={videoRef}
      className="mermaid-video"
      style={videoStyle}
      autoPlay={!reducedMotion}
      muted={audioMuted}
      loop
      playsInline
      preload="auto"
      tabIndex={-1}
      aria-label="Liliana swimming as a mermaid"
      role="img"
      onLoadedData={(event) => {
        if (reducedMotion) event.currentTarget.pause();
      }}
    >
      <source src={MERMAID_VIDEO_PATH} type="video/webm" />
    </video>
  );
}
