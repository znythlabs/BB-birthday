"use client";

import type { CSSProperties } from "react";

import type { InteractiveSeaObjectData } from "@/data/interactiveObjects";
import { projectShadow } from "@/lib/underwaterProjection.mjs";
import { SpriteActor } from "./SpriteActor";

type Props = {
  object: InteractiveSeaObjectData;
  active: boolean;
  sceneWidth: number;
  sceneHeight: number;
  onActivate: (object: InteractiveSeaObjectData) => void;
};

export function InteractiveSeaObject({
  object,
  active,
  sceneWidth,
  sceneHeight,
  onActivate,
}: Props) {
  const frameHeight = object.width * (432 / 768);
  const altitude = object.grounded
    ? 0
    : object.kind === "sea-turtle"
      ? 0.1
      : object.kind === "fish-courier"
        ? 0.72
        : 1;
  const globalX = (object.x / 100) * sceneWidth;
  const globalY = (object.y / 100) * sceneHeight;
  const projection = projectShadow({
    x: globalX,
    y: globalY,
    sceneWidth: Math.max(1, sceneWidth),
    sceneHeight: Math.max(1, sceneHeight),
    altitude,
    speed: 0,
    facing: 1,
  });
  const shadow = {
    ...projection,
    groundX: object.width / 2 + projection.groundX - globalX,
    groundY: frameHeight / 2 + projection.groundY - globalY,
  };
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
      data-grounded={object.grounded || undefined}
      onClick={() => onActivate(object)}
    >
      <span className="sea-object-glow" aria-hidden="true" />
      <SpriteActor
        clip={object.clip}
        playing={object.clip.loop || active}
        shadow={shadow}
        width={object.width}
        x={object.width / 2}
        y={frameHeight / 2}
      />
      <span className="sea-object-discovery" aria-hidden="true">
        Discover
      </span>
    </button>
  );
}
