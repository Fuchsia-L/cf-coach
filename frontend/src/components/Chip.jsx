export default function Chip({ children, mono = true, style = {}, onClick }) {
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', height: 22,
      padding: '0 8px', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
      fontSize: 'var(--type-meta)', color: 'var(--ink-2)',
      background: 'var(--card)', whiteSpace: 'nowrap',
      ...style,
    }}>{children}</span>
  );
}
