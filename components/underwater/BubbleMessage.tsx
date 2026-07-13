import type { InteractiveSeaObjectData } from "@/data/interactiveObjects";

type Props = { object: InteractiveSeaObjectData; onClose: () => void };

export function BubbleMessage({ object, onClose }: Props) {
  const horizontalAnchor = object.x < 28 ? "bubble-anchor-left" : object.x > 72 ? "bubble-anchor-right" : "bubble-anchor-center";
  const verticalAnchor = object.y > 66 ? "bubble-anchor-above" : "bubble-anchor-below";

  return (
    <section
      id="active-party-detail"
      className={`bubble-message ${horizontalAnchor} ${verticalAnchor}`}
      style={{ left: `${object.x}%`, top: `${object.y}%` }}
      aria-label={`${object.label}: ${object.value}`}
    >
      <button type="button" className="bubble-close" onClick={onClose} aria-label={`Close ${object.label}`}>×</button>
      <p className="bubble-kicker">{object.label}</p>
      <p className="bubble-value">{object.value}</p>
      <span className="bubble-tail" aria-hidden="true" />
    </section>
  );
}

