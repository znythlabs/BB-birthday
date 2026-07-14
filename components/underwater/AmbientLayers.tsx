"use client";

/* eslint-disable @next/next/no-img-element -- transparent sprite art is pre-sized and animated directly */

import { motion } from "framer-motion";

const fish = [
  { src: "/images/fish/fish-1.png", top: "27%", width: 78, duration: 24, delay: -4 },
  { src: "/images/fish/fish-3.png", top: "59%", width: 62, duration: 31, delay: -16 },
] as const;

export function AmbientLayers() {
  return (
    <>
      <div className="sunlight" aria-hidden="true"><span /><span /><span /></div>
      <img className="bubbles-overlay bubbles-overlay-left" src="/images/underwater/bubbles-overlay.png" alt="" aria-hidden="true" />
      <img className="bubbles-overlay bubbles-overlay-right" src="/images/underwater/bubbles-overlay.png" alt="" aria-hidden="true" />
      <div className="ambient-fish" aria-hidden="true">
        {fish.map((item) => (
          <motion.img
            key={item.src}
            className="ambient-fish-item"
            src={item.src}
            alt=""
            style={{ top: item.top, width: item.width }}
            initial={{ x: "-14vw" }}
            animate={{ x: "114vw", y: [0, -13, 7, 0] }}
            transition={{
              x: { duration: item.duration, delay: item.delay, repeat: Infinity, ease: "linear" },
              y: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        ))}
      </div>
      <div className="water-vignette" aria-hidden="true" />
    </>
  );
}
