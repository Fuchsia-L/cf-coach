import Annot from '../components/Annot';
import Btn from '../components/Btn';
import Chip from '../components/Chip';
import RatingChart from '../components/RatingChart';
import Glyph from '../components/Glyph';

export default function Profile() {
  return (
    <div style={{
      fontFamily: 'var(--font-ui)', fontSize: 'var(--type-body)',
      lineHeight: 'var(--leading-body)',
    }}>
      {/* HEADLINE: Up next anchor */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 360px', gap: 56,
        padding: 'var(--space-page) var(--space-page) 24px',
      }}>
        {/* Left: today's headline — the next problem */}
        <div>
          <Annot>headline · what to do now</Annot>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--type-hero)', fontWeight: 400,
            letterSpacing: 'var(--track-display)', lineHeight: 'var(--leading-display)',
            margin: '10px 0 16px', maxWidth: 920,
          }}>Sum of Subarrays.</h1>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body)', color: 'var(--mute)',
            display: 'flex', gap: 14, alignItems: 'baseline',
          }}>
            <span>1547B</span><span>·</span><span>1400</span><span>·</span>
            <span>prefix-sum</span><span>·</span><span>est. 18 min</span>
          </div>

          <div style={{
            marginTop: 20, fontFamily: 'var(--font-display)', fontSize: 'var(--type-lede)',
            lineHeight: 1.4, color: 'var(--ink-2)', maxWidth: 760,
          }}>
            Builds directly on yesterday's classification. AI tags this as
            <em> linear DP with prefix accumulation</em> — the recurrence is
            short, the implementation is the trap.
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
            <Btn primary>Open on Codeforces {Glyph.arrowRight}</Btn>
            <Btn secondary>Mark as solved</Btn>
            <Btn>Skip · pick another</Btn>
          </div>

          {/* Three lead-in problems — small */}
          <div style={{ marginTop: 36 }}>
            <Annot>lead-ins · easier warmups</Annot>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16, marginTop: 10,
            }}>
              {[
                ['1843B', 1100, 'Long Long', 'prefix · arithmetic'],
                ['1850D', 1200, 'Balanced Round', 'prefix · sort'],
                ['1788B', 1300, 'Sum Graph',     'prefix · graph'],
              ].map((r, i) => (
                <div key={i} style={{
                  border: 'var(--rule) var(--rule-style) var(--line)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)', background: 'var(--card)',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--mute)',
                  }}>
                    <span>{r[0]}</span><span>{r[1]}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginTop: 4 }}>{r[2]}</div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)',
                    color: 'var(--mute-2)', marginTop: 4,
                  }}>{r[3]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* DELTA-only KPI strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
            marginTop: 36,
            borderTop: 'var(--rule) var(--rule-style) var(--line)',
            borderBottom: 'var(--rule) var(--rule-style) var(--line)',
          }}>
            {[
              ['THIS WEEK',   '+8',   'problems · vs avg 5'],
              ['STREAK',      '4d',   'no skipped days'],
              ['LAST CONTEST', '+23', 'rating · edu r154'],
            ].map((s, i) => (
              <div key={s[0]} style={{
                padding: '20px 0',
                borderRight: i < 2 ? 'var(--rule) var(--rule-style) var(--line)' : 'none',
                paddingLeft: i ? 24 : 0,
              }}>
                <Annot>{s[0]}</Annot>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 400,
                  letterSpacing: '-.03em', lineHeight: 1, marginTop: 6,
                }}>{s[1]}</div>
                <div style={{
                  fontSize: 'var(--type-body)', color: 'var(--mute)', marginTop: 6,
                }}>{s[2]}</div>
              </div>
            ))}
          </div>

          {/* Rating chart */}
          <div style={{ marginTop: 36 }}>
            <Annot>fig. 1 · rating curve, 52 contests</Annot>
            <RatingChart h={180} />
            <div style={{
              fontSize: 'var(--type-body)', color: 'var(--mute)', marginTop: 8, fontStyle: 'italic',
              borderTop: 'var(--rule) var(--rule-style) var(--line-2)', paddingTop: 8,
            }}>
              Each dot is a contest. Hollow ring marks all-time max.
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{
            borderTop: 'var(--rule-strong) var(--rule-style) var(--rule-ink)',
            paddingTop: 14,
          }}>
            <Annot>rating</Annot>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--type-h1)', fontWeight: 400,
                letterSpacing: '-.03em', lineHeight: 1,
              }}>1547</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body)',
                color: 'var(--accent-2, var(--accent))',
              }}>{Glyph.arrowUp} +23</span>
            </div>
            <div style={{
              fontSize: 'var(--type-body)', color: 'var(--mute)', marginTop: 6,
            }}>specialist · peak 1873 · feb '25</div>
          </div>

          <div style={{ borderTop: 'var(--rule) var(--rule-style) var(--line)', paddingTop: 14 }}>
            <Annot>training · stage 5 of 16</Annot>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--type-h3)', fontWeight: 400,
              letterSpacing: '-.02em', margin: '4px 0 10px', fontStyle: 'italic',
            }}>Prefix &amp; difference</h3>
            <div style={{ height: 1, background: 'var(--line)', marginBottom: 8 }}>
              <div style={{ height: 3, width: '60%', background: 'var(--ink)', marginTop: -1 }} />
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute)',
            }}>6 / 10 problems · 60%</div>
          </div>

          <div style={{ borderTop: 'var(--rule) var(--rule-style) var(--line)', paddingTop: 14 }}>
            <Annot>review · today</Annot>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--type-h3)', fontWeight: 400,
              letterSpacing: '-.02em', margin: '4px 0 10px', fontStyle: 'italic',
            }}>14 cards await</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 'var(--type-body)' }}>
              {[
                ['Pitfall',   'Off-by-one in difference array'],
                ['Knowledge', 'Monotonic stack invariants'],
                ['Strategy',  'DFS vs BFS — when to switch'],
              ].map((r, i) => (
                <li key={i} style={{
                  display: 'flex', justifyContent: 'space-between', gap: 12,
                  padding: '8px 0', borderTop: 'var(--rule) var(--rule-style) var(--line-2)',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)',
                    textTransform: 'uppercase',
                    color: 'var(--mute)', width: 70, flexShrink: 0,
                  }}>{r[0]}</span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{r[1]}</span>
                </li>
              ))}
            </ul>
            <Btn style={{ marginTop: 10, width: '100%' }}>Start review · 18 min</Btn>
          </div>
        </aside>
      </div>

      {/* Recent moves — compressed timeline */}
      <div style={{
        padding: '24px var(--space-page) 64px',
        borderTop: 'var(--rule) var(--rule-style) var(--line)',
        marginTop: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
          <Annot>recent moves</Annot>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip>all</Chip><Chip>AC only</Chip><Chip>contests</Chip>
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 17, fontStyle: 'italic',
          color: 'var(--ink-2)', marginBottom: 18, maxWidth: 820,
        }}>
          2 hours ago — caught the recurrence on 1893C first try.
          The bit-by-bit prefix-sum pattern is starting to feel automatic.
        </div>

        <div style={{ borderTop: 'var(--rule) var(--rule-style) var(--line-2)' }}>
          {[
            ['AC', '2h ago',   '1893C · Forbidden Subsequence',     '1500 · dp · greedy'],
            ['AC', '5h ago',   '1879B · Chips on the Board',         '1100 · constructive'],
            ['WA', 'yesterday','1891D · Suspicious Logarithms',      '1900 · binary-search'],
            ['AC', '3d ago',   'Edu Round 154 · Div 2',              'contest · 4/5 · rank 1240'],
            ['AC', '4d ago',   '1879D · Sum of XOR Functions',       '1900 · bitmask · prefix-sum'],
          ].map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '40px 90px 1fr 1fr auto',
              gap: 16, alignItems: 'baseline',
              padding: '12px 0',
              borderBottom: 'var(--rule) var(--rule-style) var(--line-2)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)',
                color: r[0] === 'AC' ? 'var(--ink)' : 'var(--mute)', fontWeight: 600,
              }}>{r[0]}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute)',
              }}>{r[1]}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{r[2]}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute)',
              }}>{r[3]}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute-2)',
              }}>{Glyph.arrowRight}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <Btn>See all activity {Glyph.arrowRight}</Btn>
        </div>
      </div>
    </div>
  );
}
