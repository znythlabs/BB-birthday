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
  const videoStyle = {
    left: x,
    top: y,
    width,
    transform: `translate(-50%, -50%) scaleX(${facing})`,
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
        renderSubject={false}
      />
      <div className="sprite-actor-layer mermaid-actor" data-action={action}>
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
      </div>
    </>
  );
}
