import Annot from './Annot';

export default function PageHead({ kicker, title, lede }) {
  return (
    <div style={{ padding: 'var(--space-page) var(--space-page) 24px' }}>
      <Annot>{kicker}</Annot>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--type-h1)', fontWeight: 400,
        letterSpacing: 'var(--track-display)', lineHeight: 'var(--leading-display)',
        margin: '8px 0 16px', maxWidth: 980,
      }}>{title}</h1>
      {lede && (
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--type-lede)', lineHeight: 1.5,
          color: 'var(--ink-2)', maxWidth: 760, fontStyle: 'var(--lede-style)',
        }}>
          {lede}
        </div>
      )}
    </div>
  );
}
