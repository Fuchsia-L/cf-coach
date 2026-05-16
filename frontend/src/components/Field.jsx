export default function Field({ label, value, w = 200, h = 32, mono = true }) {
  return (
    <div style={{
      width: w, height: h, border: '1px solid var(--line)', borderRadius: 'var(--radius)',
      display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8,
      background: 'var(--card)',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
      fontSize: 'var(--type-body)', color: 'var(--ink-2)',
    }}>
      {label && (
        <span style={{
          color: 'var(--mute-2)', fontSize: 'var(--type-micro)',
          textTransform: 'uppercase', letterSpacing: '.06em',
        }}>{label}</span>
      )}
      <span>{value}</span>
    </div>
  );
}
