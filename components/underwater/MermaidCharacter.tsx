"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { spriteCatalog } from "@/data/spriteCatalog";
import type { SpriteProjection } from "./SpriteActor";
import { SpriteActor } from "./SpriteActor";

export type MermaidAction = "idle" | "swim" | "discover";

const MERMAID_VIDEO_PATH = "/images/mermaid/mermaid-transparent.webm";

type MermaidCharacterProps = {
  action: MermaidAction;
  x: number;
  y: number;
  width: number;
  facing: 1 | -1;
  shadow: SpriteProjection;
  audioMuted: boolean;
};

export function MermaidCharacter({ action, x, y, width, facing, shadow, audioMuted }: MermaidCharacterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const videoStyle = {
    left: x,
    top: y,
    width,
    transform: `translate(-50%, -50%) scaleX(${facing})`,
  } as CSSProperties;

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 1200px)");
    const syncPreferences = () => {
      const reduced = motionQuery.matches;
      const mobile = mobileQuery.matches;
      setReducedMotion(reduced);
      setIsMobile(mobile);
      const video = videoRef.current;
      if (!video) return;
      if (reduced || mobile) video.pause();
      else void video.play().catch(() => undefined);
    };

    syncPreferences();
    motionQuery.addEventListener("change", syncPreferences);
    mobileQuery.addEventListener("change", syncPreferences);
    return () => {
      motionQuery.removeEventListener("change", syncPreferences);
      mobileQuery.removeEventListener("change", syncPreferences);
    };
  }, []);

  return (
    <>
      <SpriteActor
        className="mermaid-shadow"
        clip={spriteCatalog.mermaid[action]}
        facing={facing}
        shadow={shadow}
        width={width}
        x={x}
        y={y}
        renderSubject={isMobile}
      />
      <div className="sprite-actor-layer mermaid-actor" data-action={action}>
        <video
          ref={videoRef}
          className="mermaid-video"
          style={videoStyle}
          autoPlay={!reducedMotion && !isMobile}
          muted={audioMuted}
          loop
          playsInline
          preload={isMobile ? "none" : "auto"}
          tabIndex={-1}
          aria-label="Liliana swimming as a mermaid"
          role="img"
          onLoadedData={(event) => {
            if (reducedMotion || isMobile) event.currentTarget.pause();
          }}
        >
          <source src={MERMAID_VIDEO_PATH} type="video/webm" />
        </video>
      </div>
    </>
  );
}
