export default function Btn({ children, primary = false, secondary = false, mono = false, style = {}, onClick }) {
  const border = primary
    ? '1px solid var(--accent)'
    : secondary
      ? '1px solid var(--accent-2, var(--line))'
      : '1px solid var(--line)';
  const background = primary ? 'var(--accent)' : 'var(--card)';
  const color = primary
    ? 'var(--card)'
    : secondary
      ? 'var(--accent-2, var(--ink))'
      : 'var(--ink)';
  return (
    <button onClick={onClick} style={{
      height: 32, padding: '0 14px',
      border, background, color,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
      fontSize: 'var(--type-body)', fontWeight: 500,
      borderRadius: 'var(--radius)', cursor: 'pointer', ...style,
    }}>{children}</button>
  );
}
