"use client";

/* eslint-disable @next/next/no-img-element -- transparent sprite art is pre-sized and animated directly */

import type { CSSProperties } from "react";

const fish = [
  { src: "/images/fish/fish-1.png", top: "27%", width: 78, duration: 24, delay: -4 },
  { src: "/images/fish/fish-3.png", top: "59%", width: 62, duration: 31, delay: -16 },
] as const;

export function AmbientLayers() {
  return (
    <>
      <div className="sunlight" aria-hidden="true"><span /><span /><span /></div>
      <div className="ambient-fish" aria-hidden="true">
        {fish.map((item) => (
          <span
            key={item.src}
            className="ambient-fish-track"
            style={{ top: item.top, "--fish-duration": `${item.duration}s`, "--fish-delay": `${item.delay}s` } as CSSProperties}
          >
            <img
              className="ambient-fish-item"
              src={item.src}
              alt=""
              data-flee-fish
              style={{ width: item.width }}
            />
          </span>
        ))}
      </div>
      <div className="water-vignette" aria-hidden="true" />
    </>
  );
}
