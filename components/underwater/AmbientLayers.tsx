"use client";

export function AmbientLayers() {
  return (
    <>
      <div className="sunlight" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="water-vignette" aria-hidden="true" />
    </>
  );
}
