import Annot from '../components/Annot';
import Chip from '../components/Chip';
import PageHead from '../components/PageHead';
import SectionRule from '../components/SectionRule';

export default function Analytics() {
  return (
    <div style={{
      fontFamily: 'var(--font-ui)', fontSize: 'var(--type-body)',
      lineHeight: 'var(--leading-body)',
    }}>
      <PageHead
        kicker="analytics · last 60 days"
        title={<>You're sharp on prefix-sum.<br/><em style={{ color: 'var(--mute)' }}>You go quiet on trees.</em></>}
        lede={<>312 problems, 47 tags, 9 of which the AI considers your <em>weak edges</em>. Two of them appear in 80% of next-stage problems.<sup style={{ fontSize: 11 }}>1</sup></>}
      />

      {/* §01 RADAR */}
      <SectionRule
        kicker="§ 01"
        title="Ability across tags"
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip>CF tags</Chip>
            <Chip style={{ background: 'var(--ink)', color: 'var(--card)', borderColor: 'var(--ink)' }}>AI subtags</Chip>
          </div>
        }
      />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48,
        padding: '24px var(--space-page) 0',
      }}>
        <Radar />
        <div>
          <Annot>reading the chart</Annot>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1.6,
            color: 'var(--ink-2)', marginTop: 8,
          }}>
            Each axis is one knowledge area. Distance from center = ability,
            blended from <em>AC count</em>, <em>pass rate</em>, and <em>average rating cleared</em>.
          </p>
          <div style={{
            marginTop: 18, fontFamily: 'var(--font-display)', fontSize: 14,
            fontStyle: 'italic', color: 'var(--mute)',
          }}>
            6 strong · 2 mid · 2 weak
          </div>
          <Annot style={{ marginTop: 22 }}>weak edges only</Annot>
          <ul style={{
            listStyle: 'none', margin: '8px 0 0', padding: 0,
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body)',
          }}>
            {[['dp · tree', '40%'], ['graphs · shortest path', '45%'], ['math · combinatorics', '58%']].map((r, i) => (
              <li key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0',
                borderTop: i
                  ? 'var(--rule) var(--rule-style) var(--line-2)'
                  : 'var(--rule) var(--rule-style) var(--line)',
              }}>
                <span style={{ color: 'var(--ink)' }}>{r[0]}</span>
                <span style={{ color: 'var(--mute)' }}>{r[1]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Caption>fig. 1 — toggle between codeforces native tags and the AI's finer subdivisions.</Caption>

      {/* §02 HISTOGRAM */}
      <SectionRule kicker="§ 02" title="Solved by rating bucket" />
      <div style={{ padding: '28px var(--space-page) 0' }}>
        <Histogram />
      </div>
      <Caption>fig. 2 — solid = accepted, dashed = attempted but unsolved. The wall is at 1700.</Caption>

      {/* §03 WEAKNESS RANKING */}
      <SectionRule
        kicker="§ 03"
        title="Weak edges"
        right={
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute)',
          }}>min 5 attempts · sorted by pass-rate ↑</span>
        }
      />
      <div style={{ padding: '24px var(--space-page) 0' }}>
        {[
          ['dp · tree', 0.40, '4 / 10', '1547D · Co-growing Sequence', '◇ active'],
          ['graphs · shortest path', 0.45, '5 / 11', '1593E · Gardener &amp; Tree', '◇ active'],
          ['binary-search · on answer', 0.52, '9 / 17', '1856C · To Become Max', '◇ queued'],
          ['math · combinatorics', 0.58, '7 / 12', '1547E · Air Conditioners', '— '],
          ['constructive · parity', 0.61, '11 / 18', '1873G · ABBC or BACB', '— '],
        ].map((r, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '40px 200px 1fr 120px 1fr 80px', gap: 18,
            padding: '14px 0',
            borderTop: 'var(--rule) var(--rule-style) var(--line-2)',
            alignItems: 'baseline',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute-2)',
            }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>{r[0]}</span>
            <div>
              <div style={{ height: 6, background: 'var(--line-2)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${r[1] * 100}%`, background: 'var(--ink-2)' }} />
              </div>
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body)', color: 'var(--mute)',
            }}>{Math.round(r[1] * 100)}% · {r[2]}</span>
            <span
              style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body)', color: 'var(--ink-2)' }}
              dangerouslySetInnerHTML={{ __html: 'rec → ' + r[3] }}
            />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)',
              textTransform: 'uppercase', letterSpacing: '.08em',
              color: 'var(--mute)', textAlign: 'right',
            }}>{r[4]}</span>
          </div>
        ))}
      </div>
      <Caption>fig. 3 — only tags with ≥ 5 attempts appear. "active" = picked up by training queue.</Caption>

      {/* footnotes */}
      <div style={{
        margin: '40px var(--space-page) 56px',
        paddingTop: 16,
        borderTop: 'var(--rule) var(--rule-style) var(--line)',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)',
        color: 'var(--mute)', lineHeight: 1.7,
      }}>
        <sup>1</sup>&nbsp; based on tag co-occurrence in stage 5–8 problems · 1218 problems sampled<br />
        <sup>2</sup>&nbsp; "ability" = 0.4·AC + 0.4·passRate + 0.2·avgRatingCleared (normalized)<br />
        <sup>3</sup>&nbsp; subtag classification by gemini · last batch 14:30 today
      </div>
    </div>
  );
}

function Caption({ children }) {
  return (
    <div style={{
      padding: '12px var(--space-page) 0',
      fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)',
      color: 'var(--mute)', fontStyle: 'italic',
    }}>{children}</div>
  );
}

function Radar() {
  const axes = ['dp', 'graphs', 'math', 'greedy', 'binary-search', 'data-structures', 'strings', 'constructive'];
  const you = [0.78, 0.45, 0.64, 0.85, 0.62, 0.55, 0.40, 0.70];
  const avg = [0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55];
  const cx = 280, cy = 240, R = 200;
  const pt = (i, v) => {
    const a = (i / axes.length) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
  };
  const poly = (vals) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  return (
    <svg viewBox="0 0 560 480" style={{ width: '100%', height: 460 }}>
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <polygon key={i} points={axes.map((_, j) => pt(j, r).join(',')).join(' ')}
                 fill="none" stroke="var(--line)" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" />;
      })}
      <polygon points={poly(avg)} fill="rgba(0,0,0,.04)" stroke="var(--mute-2)" strokeDasharray="3 3" />
      <polygon points={poly(you)} fill="rgba(0,0,0,.12)" stroke="var(--ink)" strokeWidth="1.5" />
      {you.map((v, i) => {
        const [x, y] = pt(i, v);
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--ink)" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 1.13);
        return (
          <text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fontFamily="var(--font-mono)" fontSize="11" fill="var(--ink)">{a}</text>
        );
      })}
    </svg>
  );
}

function Histogram() {
  const buckets = [
    [800, 38, 2], [900, 42, 3], [1000, 51, 4], [1100, 46, 6],
    [1200, 40, 5], [1300, 35, 8], [1400, 28, 9], [1500, 22, 12],
    [1600, 14, 11], [1700, 8, 13], [1800, 4, 9], [1900, 1, 6],
    [2000, 0, 3],
  ];
  const W = 1304, H = 220, max = Math.max(...buckets.map(([, a, b]) => a + b));
  const bw = W / buckets.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 36}`} style={{ width: '100%', height: H + 50, display: 'block' }}>
      <line x1="0" x2={W} y1={H} y2={H} stroke="var(--mute-2)" />
      {buckets.map(([r, ac, fail], i) => {
        const acH = (ac / max) * (H - 20);
        const faH = (fail / max) * (H - 20);
        const x = i * bw + 8;
        return (
          <g key={r}>
            <rect x={x} y={H - acH} width={bw - 16} height={acH} fill="var(--ink)" />
            <rect x={x} y={H - acH - faH} width={bw - 16} height={faH}
                  fill="none" stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 2" />
            <text x={x + (bw - 16) / 2} y={H + 14} textAnchor="middle"
                  fontFamily="var(--font-mono)" fontSize="10" fill="var(--mute)">{r}</text>
            {ac > 0 && (
              <text x={x + (bw - 16) / 2} y={H - acH - faH - 6} textAnchor="middle"
                    fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-2)">{ac}</text>
            )}
          </g>
        );
      })}
      <g transform={`translate(${W - 220}, 12)`}>
        <rect width="12" height="10" fill="var(--ink)" />
        <text x="18" y="9" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink)">accepted</text>
        <rect x="100" width="12" height="10" fill="none" stroke="var(--ink)" strokeDasharray="3 2" />
        <text x="118" y="9" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink)">attempted</text>
      </g>
    </svg>
  );
}
