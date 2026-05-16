export default function Spark({ w = 120, h = 28, points, dark = false }) {
  const pts = points || [4, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15, 18];
  const max = Math.max(...pts), min = Math.min(...pts);
  const dx = w / (pts.length - 1);
  const norm = pts.map((v, i) => [i * dx, h - ((v - min) / (max - min || 1)) * (h - 4) - 2]);
  const d = norm.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={dark ? 'rgba(255,255,255,.7)' : 'var(--ink-2)'} strokeWidth="1.25" />
    </svg>
  );
}
