"use client";

/* eslint-disable @next/next/no-img-element -- generated transparent sprites require direct DOM sizing */

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { InteractiveSeaObjectData } from "@/data/interactiveObjects";

type Props = {
  object: InteractiveSeaObjectData;
  active: boolean;
  onActivate: (object: InteractiveSeaObjectData) => void;
};

export function InteractiveSeaObject({ object, active, onActivate }: Props) {
  const style = {
    left: `${object.x}%`,
    top: `${object.y}%`,
    "--object-width": `${object.width}px`,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`sea-object sea-object-${object.kind}`}
      style={style}
      aria-label={`${object.hint}: ${object.value}`}
      aria-expanded={active}
      aria-controls={active ? "active-party-detail" : undefined}
      data-active={active || undefined}
      onClick={() => onActivate(object)}
    >
      <motion.span
        className="sea-object-motion"
        initial={false}
        animate={{ y: active ? -8 : 0, scale: active ? 1.08 : 1 }}
        whileHover={{ y: -6, scale: 1.055 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <span className="sea-object-glow" aria-hidden="true" />
        <img className="sea-object-art" src={object.asset} alt={object.assetAlt} draggable={false} />
        <span className="sea-object-discovery" aria-hidden="true">Discover</span>
      </motion.span>
    </button>
  );
}
