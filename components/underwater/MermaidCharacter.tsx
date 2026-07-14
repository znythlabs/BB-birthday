"use client";

/* eslint-disable @next/next/no-img-element -- layered face masking requires direct image elements */

import { motion } from "framer-motion";
import { forwardRef, useState } from "react";

const FINAL_FACE_PATH = "/images/mermaid/baby-face.png";
const PLACEHOLDER_FACE_PATH = "/images/mermaid/baby-face-placeholder.png";

export const MermaidCharacter = forwardRef<HTMLDivElement>(function MermaidCharacter(_, ref) {
  const [faceSrc, setFaceSrc] = useState(FINAL_FACE_PATH);

  return (
    <div ref={ref} className="mermaid-position" aria-hidden="true" data-testid="mermaid">
      <motion.div
        className="mermaid-float"
        animate={{ y: [-4, 5, -4], rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <img
          className="mermaid-art"
          src="/images/mermaid/baby-mermaid-main.png"
          alt=""
          draggable={false}
        />
        <img
          className="mermaid-face-photo"
          src={faceSrc}
          alt=""
          draggable={false}
          onError={() => {
            if (faceSrc !== PLACEHOLDER_FACE_PATH) setFaceSrc(PLACEHOLDER_FACE_PATH);
          }}
        />
      </motion.div>
    </div>
  );
});
