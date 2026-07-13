import type { InteractiveSeaObjectData } from "@/data/interactiveObjects";

type Props = { object: InteractiveSeaObjectData; active: boolean; onActivate: (object: InteractiveSeaObjectData) => void };

export function InteractiveSeaObject({ object, active, onActivate }: Props) {
  return (
    <button
      type="button"
      className={`sea-object sea-object-${object.kind}`}
      style={{ left: `${object.x}%`, top: `${object.y}%` }}
      aria-label={`${object.hint}: ${object.value}`}
      aria-expanded={active}
      aria-controls={active ? "active-party-detail" : undefined}
      data-active={active || undefined}
      onClick={() => onActivate(object)}
    >
      <span className="sea-object-glow" aria-hidden="true" />
      <span className="sea-object-icon" aria-hidden="true">{object.icon}</span>
      <span className="sea-object-label">{object.hint}</span>
    </button>
  );
}
