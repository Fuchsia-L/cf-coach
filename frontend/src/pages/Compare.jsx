import { useState } from 'react';
import Annot from '../components/Annot';
import Btn from '../components/Btn';
import Chip from '../components/Chip';
import PageHead from '../components/PageHead';
import SectionRule from '../components/SectionRule';
import Glyph from '../components/Glyph';

export default function Compare() {
  return (
    <div style={{
      fontFamily: 'var(--font-ui)', fontSize: 'var(--type-body)',
      lineHeight: 'var(--leading-body)',
    }}>
      <PageHead
        kicker="compare · head-to-head"
        title={<>You and Sloane, side by side.</>}
        lede={<>Sloane is 102 rating ahead but you've solved 47 more problems. The gap is in <em>graphs</em> and <em>flows</em>; you're stronger in <em>dp</em> and <em>greedy</em>. Below: where to push, what to ask, what to teach.<sup style={{ fontSize: 11 }}>1</sup></>}
      />

      {/* §01 Roster */}
      <SectionRule kicker="§ 01" title="The roster" right={<Btn>+ add teammate</Btn>} />
      <div style={{ padding: '20px var(--space-page) 0' }}>
        <RosterRow you handle="tourist_wannabe" name="You" rating={1547} max={1873} ac={312} stage="5/16 · prefix sums" strong="dp · greedy" weak="graphs · flows" active />
        <RosterRow handle="sloane_h" name="Sloane" rating={1649} max={1721} ac={265} stage="6/16 · graph theory I" strong="graphs · math" weak="dp · strings" />
        <RosterRow handle="kaito_42" name="Kaito" rating={1402} max={1402} ac={198} stage="4/16 · two pointers" strong="ad-hoc · brute" weak="dp · graphs" muted />
      </div>
      <Caption>fig. 1 — click a row to make that teammate the focus of the page below.</Caption>

      {/* §02 The gap */}
      <SectionRule
        kicker="§ 02"
        title="The gap that matters"
        right={
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)',
          }}>focused on · sloane_h</span>
        }
      />
      <div style={{
        padding: '32px var(--space-page) 0',
        display: 'grid', gridTemplateColumns: '1fr 360px', gap: 56,
      }}>
        <div>
          <Annot>where it's biggest</Annot>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--type-h1)', fontWeight: 400,
            letterSpacing: 'var(--track-display)', lineHeight: 'var(--leading-display)',
            margin: '8px 0 16px', maxWidth: 880,
          }}>
            Sloane is <em>2.3×</em> stronger than you in <em>graphs · flow</em>.
          </h2>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--type-lede)', lineHeight: 1.55,
            color: 'var(--ink-2)', maxWidth: 720,
          }}>
            12 AC vs your 2 — and the rating range she clears is 300 above
            yours. This is where the 102-rating gap actually lives. Everything
            else is within noise.
          </p>
          <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
            <Btn primary>Queue 5 graph·flow problems {Glyph.arrowRight}</Btn>
            <Btn>Ask Sloane for a hint thread</Btn>
          </div>
        </div>
        <div style={{
          borderLeft: 'var(--rule) var(--rule-style) var(--line-2)', paddingLeft: 24,
        }}>
          <Annot>at a glance</Annot>
          <ul style={{
            listStyle: 'none', margin: '10px 0 0', padding: 0,
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body)',
          }}>
            {[
              ['rating',   '1547', '1649', '−102'],
              ['solved',   '312',  '265',  '+47'],
              ['stage',    '5',    '6',    '−1'],
              ['peak',     '1873', '1721', '+152'],
            ].map((r, i) => (
              <li key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 60px 60px 50px', gap: 8,
                padding: '10px 0',
                borderTop: 'var(--rule) var(--rule-style) var(--line-2)', alignItems: 'baseline',
              }}>
                <span style={{ color: 'var(--mute)' }}>{r[0]}</span>
                <span style={{ color: 'var(--ink)', textAlign: 'right' }}>{r[1]}</span>
                <span style={{ color: 'var(--ink-2)', textAlign: 'right' }}>{r[2]}</span>
                <span style={{ color: 'var(--ink)', textAlign: 'right' }}>{r[3]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* §03 Rating-over-time (default) · radar (toggle) */}
      <CompareChartSection />

      {/* §04 Problem venn */}
      <SectionRule
        kicker="§ 04"
        title="What you've each touched"
        right={
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute)',
          }}>last 90 days · 412 problems total</span>
        }
      />
      <div style={{
        padding: '24px var(--space-page) 0',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0,
      }}>
        <VennCol
          kicker="both solved"
          count={184}
          subtitle="The overlap. Useful for editorial discussions."
          items={[
            ['1547D', 1500, 'dp'], ['1850E', 1400, 'greedy'], ['1893A', 1100, 'ad-hoc'],
            ['1768C', 1300, 'two pointers'], ['1932F', 1700, 'binary search'],
          ]}
          tone="muted"
        />
        <VennCol
          kicker="only sloane"
          count={81}
          subtitle="The recommendation queue. Click any to add to your training."
          items={[
            ['1854E', 2100, 'graphs · flow', true],
            ['1916F', 1900, 'graphs · dijkstra', true],
            ['1882D', 1800, 'math · number theory', true],
            ['1970C', 2000, 'graphs · scc', true],
            ['1862G', 1600, 'graphs · dfs', true],
          ]}
          tone="action"
          border
        />
        <VennCol
          kicker="only you"
          count={147}
          subtitle="Your edge. Where you can pull Sloane forward."
          items={[
            ['1788D', 1700, 'dp · digit'], ['1825D', 1600, 'dp · bitmask'],
            ['1909C', 1500, 'greedy · sort'], ['1891E', 1800, 'strings · z'],
            ['1848B', 1400, 'dp · linear'],
          ]}
          tone="muted"
          border
        />
      </div>
      <Caption>fig. 2 — middle column is the action. "+" adds the problem to your recommender. Hover an item for the editorial.</Caption>

      {/* §05 Two to discuss together */}
      <SectionRule kicker="§ 05" title="Two to discuss together" right={<Chip>AI-paired</Chip>} />
      <div style={{
        padding: '32px var(--space-page) 0',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
      }}>
        <DiscussCard
          kicker="she explains to you"
          id="1854E"
          rating={2100}
          tag="graphs · flow"
          title="Min-Cost Mail Routing"
          why="Sloane solved this clean in one sitting last week. Your weakest tag, her strongest — start here."
          cta="Open thread with Sloane"
        />
        <DiscussCard
          kicker="you explain to her"
          id="1788D"
          rating={1700}
          tag="dp · digit"
          title="Lower Bound"
          why="Sloane TLE'd twice last month. You wrote a clean digit-DP. Walk her through your state."
          cta="Send your editorial"
          right
        />
      </div>

      {/* footnotes */}
      <div style={{
        margin: '64px var(--space-page) 56px', paddingTop: 16,
        borderTop: 'var(--rule) var(--rule-style) var(--line)',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)',
        color: 'var(--mute)', lineHeight: 1.7,
      }}>
        <sup>1</sup>&nbsp; deltas computed from cf api · synced 2 min ago. add up to 3 teammates; the focused row drives the page.<br />
        <sup>2</sup>&nbsp; "stronger" = (their ac × their pass rate) ÷ (your ac × your pass rate), capped 0.3–3.0.
      </div>
    </div>
  );
}

function Caption({ children }) {
  return (
    <div style={{
      padding: '10px var(--space-page) 0',
      fontFamily: 'var(--font-display)', fontSize: 'var(--type-body)', fontStyle: 'italic',
      color: 'var(--mute)', maxWidth: 900,
    }}>{children}</div>
  );
}

function RosterRow({ you, handle, name, rating, max, ac, stage, strong, weak, active, muted }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '40px 1fr 90px 90px 90px 1fr 1fr auto',
      gap: 24, alignItems: 'center',
      padding: '18px 0',
      borderTop: '1px solid var(--line-2)',
      opacity: muted ? 0.55 : 1,
      borderLeft: active ? '2px solid var(--ink)' : '2px solid transparent',
      paddingLeft: active ? 14 : 16,
      marginLeft: -16,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--line-2)', border: '1px solid var(--line)',
      }} />
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 19,
            fontStyle: you ? 'normal' : 'italic',
          }}>{name}</span>
          {you && <Chip>you</Chip>}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)', marginTop: 2,
        }}>@{handle}</div>
      </div>
      <Stat2 kicker="rating" value={rating} sub={`max ${max}`} />
      <Stat2 kicker="solved" value={ac} sub="problems" />
      <Stat2 kicker="stage" value={stage.split(' · ')[0]} sub={stage.split(' · ')[1]} />
      <TagPair kicker="strong" value={strong} />
      <TagPair kicker="weak" value={weak} />
      <Btn>{you ? 'edit' : 'focus'} {Glyph.arrowRight}</Btn>
    </div>
  );
}

function Stat2({ kicker, value, sub }) {
  return (
    <div>
      <Annot>{kicker}</Annot>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, lineHeight: 1.1, marginTop: 2,
      }}>{value}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginTop: 2,
      }}>{sub}</div>
    </div>
  );
}

function TagPair({ kicker, value }) {
  return (
    <div>
      <Annot>{kicker}</Annot>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', marginTop: 4,
      }}>{value}</div>
    </div>
  );
}

function CompareChartSection() {
  const [view, setView] = useState('line');
  const isLine = view === 'line';
  return (
    <>
      <SectionRule
        kicker="§ 03"
        title={isLine ? 'Rating over time' : 'Where each of you lives'}
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip
              style={isLine
                ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)', cursor: 'pointer' }
                : { cursor: 'pointer' }}
              onClick={() => setView('line')}
            >rating · time</Chip>
            <Chip
              style={!isLine
                ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)', cursor: 'pointer' }
                : { cursor: 'pointer' }}
              onClick={() => setView('radar')}
            >tag · radar</Chip>
          </div>
        }
      />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 360px', gap: 56,
        padding: '36px var(--space-page) 0',
      }}>
        {isLine ? <OverlaidRatingChart /> : <OverlaidRadar />}
        <div>
          <Annot>legend</Annot>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            <LegendRow swatch="solid"  label="you · tourist_wannabe" sub={isLine ? '47 contests · peak 1873' : '312 ac · 1547'} />
            <LegendRow swatch="dashed" label="sloane · sloane_h"      sub={isLine ? '38 contests · peak 1721' : '265 ac · 1649'} />
          </div>
          <div style={{
            marginTop: 28, paddingTop: 14,
            borderTop: 'var(--rule) var(--rule-style) var(--line-2)',
          }}>
            <Annot>reading the chart</Annot>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 15, lineHeight: 1.6,
              color: 'var(--ink-2)', marginTop: 8,
            }}>
              {isLine ? (
                <>Sloane caught up around contest 28 and pulled ahead at 34. Your
                <em> peak</em> is still higher (1873 vs 1721), but the recent trend
                belongs to them. The shaded band marks the gap.</>
              ) : (
                <>Sloane's shape leans <em>up and right</em> — graphs, flows, math.
                Yours leans <em>down and left</em> — dp, greedy, strings. Two
                complementary shapes. Together you'd be a balanced team.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function OverlaidRatingChart() {
  const W = 1000, H = 360;
  const padL = 44, padR = 20, padT = 20, padB = 36;
  const you = [
    900, 920, 950, 980, 1010, 1050, 1080, 1120, 1100, 1150, 1200, 1230,
    1260, 1290, 1320, 1300, 1340, 1380, 1420, 1460, 1500, 1540, 1580,
    1620, 1660, 1700, 1740, 1780, 1820, 1850, 1873, 1860, 1840, 1820,
    1790, 1770, 1740, 1710, 1690, 1670, 1650, 1630, 1610, 1590, 1570,
    1555, 1547,
  ];
  const them = [
    1000, 990, 1010, 1020, 1050, 1080, 1100, 1130, 1170, 1200, 1230, 1240,
    1250, 1260, 1280, 1290, 1310, 1330, 1360, 1390, 1420, 1450, 1480,
    1510, 1530, 1550, 1580, 1620, 1660, 1700, 1720, 1715, 1700, 1690,
    1680, 1690, 1710, 1730, 1700, 1680, 1670, 1680, 1700, 1710, 1690,
    1670, 1649,
  ];
  const lo = 800, hi = 2000;
  const x = (i) => padL + (i / (you.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const bandTop = them.map((v, i) => [x(i), y(v)]);
  const bandBot = you.map((v, i) => [x(i), y(v)]).reverse();
  const bandPath = [...bandTop, ...bandBot]
    .map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ') + ' Z';

  const yTicks = [800, 1100, 1400, 1700, 2000];
  const xMarks = [0, 11, 23, 35, 46];
  const xLabels = ['oct ’24', 'jan', 'apr', 'jul', 'now'];

  const yPeakIdx = you.indexOf(Math.max(...you));
  const tPeakIdx = them.indexOf(Math.max(...them));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
      {yTicks.map((v) => (
        <line key={v} x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--line-2)" strokeDasharray="2 3" />
      ))}
      {yTicks.map((v) => (
        <text key={v} x={padL - 8} y={y(v) + 3} textAnchor="end"
              fontFamily="var(--font-mono)" fontSize="9" fill="var(--mute)">{v}</text>
      ))}
      {xMarks.map((i, k) => (
        <g key={i}>
          <line x1={x(i)} x2={x(i)} y1={H - padB} y2={H - padB + 4} stroke="var(--mute)" />
          <text x={x(i)} y={H - padB + 16} textAnchor="middle"
                fontFamily="var(--font-mono)" fontSize="9" fill="var(--mute)">{xLabels[k]}</text>
        </g>
      ))}
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="var(--mute)" strokeWidth=".5" />

      <path d={bandPath} fill="rgba(0,0,0,.06)" />

      <path d={path(them)} fill="none" stroke="var(--ink)" strokeWidth="1.25" strokeDasharray="3 3" />
      <path d={path(you)} fill="none" stroke="var(--ink)" strokeWidth="1.6" />

      <circle cx={x(you.length - 1)} cy={y(you[you.length - 1])} r="4" fill="var(--ink)" />
      <circle cx={x(them.length - 1)} cy={y(them[them.length - 1])} r="3.5" fill="#fff" stroke="var(--ink)" strokeWidth="1.25" />

      <g>
        <circle cx={x(yPeakIdx)} cy={y(you[yPeakIdx])} r="6" fill="none" stroke="var(--ink)" strokeWidth="1" />
        <text x={x(yPeakIdx)} y={y(you[yPeakIdx]) - 12} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink)">your peak · 1873</text>
      </g>
      <g>
        <circle cx={x(tPeakIdx)} cy={y(them[tPeakIdx])} r="5" fill="none" stroke="var(--ink)" strokeDasharray="2 2" strokeWidth="1" />
        <text x={x(tPeakIdx)} y={y(them[tPeakIdx]) - 10} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize="9" fill="var(--mute)">their peak · 1721</text>
      </g>

      <text x={x(you.length - 1) - 8} y={y(you[you.length - 1]) + 4} textAnchor="end"
            fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink)">you · 1547</text>
      <text x={x(them.length - 1) - 8} y={y(them[them.length - 1]) - 8} textAnchor="end"
            fontFamily="var(--font-mono)" fontSize="10" fill="var(--mute)">them · 1649</text>
    </svg>
  );
}

function OverlaidRadar() {
  const cx = 280, cy = 240, r = 200;
  const axes = ['dp', 'graphs', 'greedy', 'math', 'strings', 'data struct', 'flows', 'geometry'];
  const angle = (i) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const you  = [0.85, 0.35, 0.78, 0.50, 0.62, 0.55, 0.18, 0.40];
  const them = [0.55, 0.82, 0.50, 0.78, 0.42, 0.60, 0.72, 0.45];
  const polyPath = (vals) => vals.map((v, i) => {
    const a = angle(i);
    return `${i ? 'L' : 'M'}${cx + Math.cos(a) * r * v},${cy + Math.sin(a) * r * v}`;
  }).join(' ') + ' Z';
  return (
    <svg viewBox="0 0 560 480" style={{ width: '100%', height: 480, display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <circle key={s} cx={cx} cy={cy} r={r * s} fill="none" stroke="var(--line-2)" />
      ))}
      {axes.map((label, i) => {
        const a = angle(i);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const lx = cx + Math.cos(a) * (r + 26), ly = cy + Math.sin(a) * (r + 26);
        return (
          <g key={label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                  fontFamily="var(--font-mono)" fontSize="11" fill="var(--mute)">{label}</text>
          </g>
        );
      })}
      <path d={polyPath(them)} fill="rgba(0,0,0,.04)" stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" />
      {them.map((v, i) => {
        const a = angle(i);
        return <circle key={i} cx={cx + Math.cos(a) * r * v} cy={cy + Math.sin(a) * r * v} r="2.5" fill="#fff" stroke="var(--ink)" />;
      })}
      <path d={polyPath(you)} fill="rgba(0,0,0,.08)" stroke="var(--ink)" strokeWidth="1.5" />
      {you.map((v, i) => {
        const a = angle(i);
        return <circle key={i} cx={cx + Math.cos(a) * r * v} cy={cy + Math.sin(a) * r * v} r="3" fill="var(--ink)" />;
      })}
    </svg>
  );
}

function LegendRow({ swatch, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width="32" height="12">
        <line x1="0" x2="32" y1="6" y2="6" stroke="var(--ink)" strokeWidth="1.5"
              strokeDasharray={swatch === 'dashed' ? '3 3' : ''} />
        <circle cx="16" cy="6" r="3" fill={swatch === 'dashed' ? '#fff' : 'var(--ink)'} stroke="var(--ink)" />
      </svg>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function VennCol({ kicker, count, subtitle, items, tone, border }) {
  const action = tone === 'action';
  return (
    <div style={{
      padding: '24px 28px',
      borderLeft: border ? '1px solid var(--line-2)' : '',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6,
      }}>
        <Annot style={{ fontWeight: action ? 700 : 400, color: action ? 'var(--ink)' : 'var(--mute-2)' }}>{kicker}</Annot>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic' }}>{count}</span>
      </div>
      <div style={{
        fontSize: 12, color: 'var(--mute)', lineHeight: 1.5, marginBottom: 14, minHeight: 36,
      }}>{subtitle}</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map(([id, rating, tag, plus], i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '60px 50px 1fr auto', gap: 10,
            alignItems: 'baseline', padding: '10px 0',
            borderTop: '1px solid var(--line-2)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>{id}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>{rating}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute-2)' }}>{tag}</span>
            {plus
              ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>+</span>
              : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute-2)' }}>{Glyph.arrowRight}</span>}
          </div>
        ))}
      </div>
      {action && (
        <Btn primary style={{ marginTop: 16, width: '100%' }}>Add all 5 to recommendations {Glyph.arrowRight}</Btn>
      )}
    </div>
  );
}

function DiscussCard({ kicker, id, rating, tag, title, why, cta, right }) {
  return (
    <div style={{
      borderTop: '1px solid var(--ink)', paddingTop: 18,
      paddingLeft: right ? 24 : 0,
      borderLeft: right ? '1px solid var(--line-2)' : 'none',
    }}>
      <Annot>{kicker}</Annot>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{id}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)' }}>{rating}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute-2)' }}>{tag}</span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 32, fontStyle: 'italic',
        lineHeight: 1.15, margin: '8px 0 12px',
      }}>{title}</div>
      <p style={{
        fontFamily: 'var(--font-display)', fontSize: 15, lineHeight: 1.55,
        color: 'var(--ink-2)', maxWidth: 460,
      }}>{why}</p>
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <Btn primary>{cta} {Glyph.arrowRight}</Btn>
        <Btn>Open problem</Btn>
      </div>
    </div>
  );
}
