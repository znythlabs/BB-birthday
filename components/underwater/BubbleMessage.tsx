
import { motion } from "framer-motion";
import type { InteractiveSeaObjectData } from "@/data/seaObjects";

type Point = { x: number; y: number };
type Props = {
  object: InteractiveSeaObjectData;
  sceneWidth: number;
  sceneHeight: number;
  position?: Point;
  mermaidPosition: Point;
  mermaidWidth: number;
};

export function BubbleMessage({
  object,
  sceneWidth,
  sceneHeight,
  position,
  mermaidPosition,
  mermaidWidth,
}: Props) {
  const width = Math.max(1, sceneWidth);
  const height = Math.max(1, sceneHeight);
  const cardWidth = sceneWidth > 32 ? Math.min(280, Math.max(180, width - 32)) : 280;
  const anchorX = position?.x ?? (object.x / 100) * width;
  const anchorY = position?.y ?? (object.y / 100) * height;
  const cardHeight = 92;
  const minX = 16;
  const maxX = Math.max(minX, width - cardWidth - 16);
  const minY = 16;
  const maxY = Math.max(minY, height - cardHeight - 16);
  const mermaidHalfWidth = Math.max(120, mermaidWidth / 2);
  const mermaidHalfHeight = mermaidHalfWidth * 0.56;
  const mermaidRect = {
    left: mermaidPosition.x - mermaidHalfWidth - 24,
    right: mermaidPosition.x + mermaidHalfWidth + 24,
    top: mermaidPosition.y - mermaidHalfHeight - 24,
    bottom: mermaidPosition.y + mermaidHalfHeight + 24,
  };
  const candidates = [
    { left: anchorX + 18, top: anchorY - cardHeight - 18 },
    { left: anchorX - cardWidth - 18, top: anchorY - cardHeight - 18 },
    { left: anchorX + 18, top: anchorY + 18 },
    { left: anchorX - cardWidth - 18, top: anchorY + 18 },
  ].map((candidate) => ({
    left: Math.min(maxX, Math.max(minX, candidate.left)),
    top: Math.min(maxY, Math.max(minY, candidate.top)),
  }));
  const overlapsMermaid = (candidate: (typeof candidates)[number]) =>
    candidate.left < mermaidRect.right && candidate.left + cardWidth > mermaidRect.left &&
    candidate.top < mermaidRect.bottom && candidate.top + cardHeight > mermaidRect.top;
  const chosen = candidates.find((candidate) => !overlapsMermaid(candidate)) ?? candidates[0];
  const side = chosen.left >= anchorX ? "bubble-anchor-left" : "bubble-anchor-right";
  const above = chosen.top < anchorY;

  return (
    <section
      id="active-party-detail"
      className={`bubble-message ${side} ${above ? "bubble-anchor-above" : "bubble-anchor-below"}`}
      style={{ left: chosen.left, top: chosen.top, width: cardWidth }}
      aria-label={`${object.label}: ${object.value}`}
    >
      <motion.div
        className="bubble-message-card"
        initial={{ opacity: 0, scale: 0.88, y: above ? 8 : -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        <p className="bubble-kicker">{object.label}</p>
        <p className="bubble-value">{object.value}</p>
        <span className="bubble-tail" aria-hidden="true" />
      </motion.div>
    </section>
  );
}
