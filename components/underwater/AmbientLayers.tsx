const bubbles = [[7, 11, 0, 10], [14, 7, 4, 13], [23, 13, 8, 12], [33, 8, 2, 15], [47, 11, 6, 11], [59, 6, 1, 14], [69, 14, 7, 16], [78, 9, 3, 12], [87, 12, 9, 14], [94, 7, 5, 11]] as const;
const fish = [
  { top: 31, delay: -3, duration: 23, color: "#ffd27f", scale: 0.78 },
  { top: 52, delay: -14, duration: 29, color: "#c8b6ff", scale: 0.62 },
  { top: 20, delay: -8, duration: 34, color: "#ff9daf", scale: 0.48 },
] as const;

export function AmbientLayers() {
  return (
    <>
      <div className="sunlight" aria-hidden="true"><span /><span /><span /></div>
      <div className="ambient-bubbles" aria-hidden="true">
        {bubbles.map(([left, size, delay, duration], index) => (
          <span key={index} style={{ left: `${left}%`, width: `${size}px`, height: `${size}px`, animationDelay: `-${delay}s`, animationDuration: `${duration}s` }} />
        ))}
      </div>
      <div className="ambient-fish" aria-hidden="true">
        {fish.map((item, index) => (
          <span className="ambient-fish-item" key={index} style={{ top: `${item.top}%`, color: item.color, animationDelay: `${item.delay}s`, animationDuration: `${item.duration}s`, transform: `scale(${item.scale})` }}><i /></span>
        ))}
      </div>
      <div className="water-vignette" aria-hidden="true" />
    </>
  );
}

