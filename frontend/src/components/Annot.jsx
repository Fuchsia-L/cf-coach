export default function Annot({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--mute-2)',
      textTransform: 'uppercase', letterSpacing: '.08em', ...style,
    }}>{children}</div>
  );
}
