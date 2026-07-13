import { forwardRef } from "react";

export const MermaidCharacter = forwardRef<HTMLDivElement>(function MermaidCharacter(_, ref) {
  return (
    <div ref={ref} className="mermaid-position" aria-hidden="true" data-testid="mermaid">
      <div className="mermaid-float">
        <div className="mermaid-hair mermaid-hair-left" />
        <div className="mermaid-hair mermaid-hair-right" />
        <div className="mermaid-head">
          <div className="mermaid-face-placeholder">
            <span className="face-eye face-eye-left" />
            <span className="face-eye face-eye-right" />
            <span className="face-smile" />
          </div>
          <div
            className="mermaid-face-photo"
            style={{ backgroundImage: "url('/images/mermaid/baby-face.png')" }}
          />
          <span className="mermaid-crown">✦</span>
        </div>
        <div className="mermaid-body">
          <span className="mermaid-arm mermaid-arm-left" />
          <span className="mermaid-arm mermaid-arm-right" />
          <span className="mermaid-shell mermaid-shell-left" />
          <span className="mermaid-shell mermaid-shell-right" />
          <div className="mermaid-tail">
            <span className="mermaid-fin mermaid-fin-top" />
            <span className="mermaid-fin mermaid-fin-bottom" />
          </div>
        </div>
      </div>
    </div>
  );
});
