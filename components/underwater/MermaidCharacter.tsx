"use client";

import { spriteCatalog } from "@/data/spriteCatalog";
import { SpriteActor, type SpriteProjection } from "./SpriteActor";

export type MermaidAction = keyof typeof spriteCatalog.mermaid;

type MermaidCharacterProps = {
  action: MermaidAction;
  x: number;
  y: number;
  width: number;
  facing: 1 | -1;
  shadow: SpriteProjection;
};

export function MermaidCharacter({
  action,
  x,
  y,
  width,
  facing,
  shadow,
}: MermaidCharacterProps) {
  return (
    <SpriteActor
      className="mermaid-actor"
      clip={spriteCatalog.mermaid[action]}
      facing={facing}
      label="Liliana swimming as a mermaid"
      shadow={shadow}
      width={width}
      x={x}
      y={y}
    />
  );
}
