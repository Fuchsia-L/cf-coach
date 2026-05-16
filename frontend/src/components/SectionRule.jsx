export default function SectionRule({ kicker, title, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 16,
      padding: '32px var(--space-page) 12px',
      borderBottom: 'var(--rule-strong) var(--rule-style) var(--rule-ink)',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', fontWeight: 600,
        letterSpacing: '.14em',
      }}>{kicker}</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--type-h3)', fontStyle: 'italic',
      }}>{title}</span>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}
