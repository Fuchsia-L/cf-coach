export default function Hatch({ label, w = '100%', h = 80, dense = false, dark = false, style = {} }) {
  const stroke = dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.07)';
  const gap = dense ? 5 : 8;
  return (
    <div style={{
      width: w, height: h, position: 'relative',
      background: `repeating-linear-gradient(135deg, transparent 0 ${gap - 1}px, ${stroke} ${gap - 1}px ${gap}px)`,
      border: `1px ${dark ? 'solid rgba(255,255,255,.18)' : 'dashed var(--line)'}`,
      borderRadius: 'var(--radius)', ...style,
    }}>
      {label && (
        <span style={{
          position: 'absolute', left: 8, top: 6,
          fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', letterSpacing: '.04em',
          color: dark ? 'rgba(255,255,255,.55)' : 'var(--mute)', textTransform: 'uppercase',
        }}>{label}</span>
      )}
    </div>
  );
}
