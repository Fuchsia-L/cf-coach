export default function RatingChart({ h = 220, dark = false }) {
  const pts = [
    [40, 170], [110, 160], [180, 175], [250, 140], [320, 150],
    [390, 120], [460, 130], [530, 95], [600, 110], [670, 80],
    [740, 90], [810, 60], [880, 75], [950, 50],
  ];
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  return (
    <svg viewBox={`0 0 1000 ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      {[40, 80, 120, 160, 200].map((y) => (
        <line key={y} x1="40" x2="980" y1={y} y2={y} stroke="var(--line-2)" />
      ))}
      <line x1="40" x2="980" y1="200" y2="200" stroke="var(--mute)" strokeWidth=".5" />
      {[[40, '2000'], [80, '1700'], [120, '1400'], [160, '1100'], [200, '800']].map(([y, t]) => (
        <text key={t} x="32" y={y + 3} textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--mute)">{t}</text>
      ))}
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3.5 : 2} fill="var(--accent)" />
      ))}
      <g>
        <circle cx="950" cy="50" r="5" fill="none" stroke="var(--accent-2, var(--accent))" strokeWidth="1" />
        <text x="942" y="42" textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--mute)">MAX 1873</text>
      </g>
    </svg>
  );
}
