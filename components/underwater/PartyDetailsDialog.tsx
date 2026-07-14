import { useEffect, useRef } from "react";
/* eslint-disable @next/next/no-img-element -- small local sprite thumbnails are already optimized */
import { interactiveObjects } from "@/data/interactiveObjects";

export function PartyDetailsDialog({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    closeButtonRef.current?.focus();
    if (!dialog) return;

    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = dialog.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", keepFocusInside);
    return () => dialog.removeEventListener("keydown", keepFocusInside);
  }, []);

  return (
    <div className="details-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="details-dialog" role="dialog" aria-modal="true" aria-labelledby="details-dialog-title">
        <div className="details-dialog-heading">
          <div><p className="details-dialog-kicker">All the treasures</p><h2 id="details-dialog-title">Liliana’s party details</h2></div>
          <button ref={closeButtonRef} type="button" className="details-dialog-close" onClick={onClose} aria-label="Close all party details">×</button>
        </div>
        <dl className="details-list">
          {interactiveObjects.map((object) => (
            <div className="details-list-item" key={object.id}>
              <span className="details-list-art" aria-hidden="true"><img src={object.asset} alt="" /></span>
              <div><dt>{object.label}</dt><dd>{object.value}</dd></div>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
