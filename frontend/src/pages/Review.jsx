import Annot from '../components/Annot';
import Btn from '../components/Btn';
import Chip from '../components/Chip';
import PageHead from '../components/PageHead';
import SectionRule from '../components/SectionRule';
import Glyph from '../components/Glyph';

export default function Review() {
  return (
    <div style={{
      fontFamily: 'var(--font-ui)', fontSize: 'var(--type-body)',
      lineHeight: 'var(--leading-body)',
    }}>
      <PageHead
        kicker="review · spaced repetition"
        title={<>14 cards want a moment of your attention.</>}
        lede={<>The deck is small today. Five from <em>pitfalls</em>, four <em>knowledge</em>, three <em>strategies</em>, two <em>syntax</em>. Tomorrow it grows to 22.<sup style={{ fontSize: 11 }}>1</sup></>}
      />

      {/* §01 Today's stack */}
      <SectionRule
        kicker="§ 01"
        title="Today's stack"
        right={
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute)',
          }}>1 of 14 · est. 18 min</span>
        }
      />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 360px', gap: 56,
        padding: '36px var(--space-page) 0',
      }}>
        <CardStack />
        <div>
          <details style={{ marginBottom: 16 }}>
            <summary style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', listStyle: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute-2)',
              textTransform: 'uppercase', letterSpacing: '.08em',
            }}>
              <span style={{
                width: 16, height: 16, borderRadius: '50%', border: '1px solid var(--line)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: 'var(--mute)',
              }}>?</span>
              how this works
            </summary>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 14, lineHeight: 1.6,
              color: 'var(--ink-2)', marginTop: 10,
            }}>
              Front of the card asks. Click to flip. Then mark — <em>remembered</em>,
              <em> blurry</em>, or <em>forgot</em> — and the schedule adjusts.
              <span style={{
                display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--mute)', marginTop: 8,
              }}>
                remembered → 7d &nbsp;·&nbsp; blurry → 1d &nbsp;·&nbsp; forgot → 10 min
              </span>
            </p>
          </details>
          <Annot>session</Annot>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic',
            margin: '6px 0 14px',
          }}>
            14 cards · 18 min
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn primary>Start session {Glyph.arrowRight}</Btn>
            <Btn>Skip today</Btn>
          </div>
        </div>
      </div>

      {/* §02 Library */}
      <SectionRule
        kicker="§ 02"
        title="Card library"
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip>all · 312</Chip>
            <Chip>pitfall · 84</Chip>
            <Chip>knowledge · 142</Chip>
            <Chip>strategy · 56</Chip>
            <Chip>syntax · 30</Chip>
          </div>
        }
      />
      <div style={{ padding: '24px var(--space-page) 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            ['pitfall',   'Off-by-one in difference array',     'When updating diff[r+1] to undo, the boundary must be one past the inclusive end.', 'next: tomorrow', 'created 4d ago'],
            ['knowledge', 'Monotonic stack invariants',          'Stack elements always decrease (or increase) — when violated, pop until restored.',     'next: in 3 days', 'created 1w ago'],
            ['strategy',  'When to switch from DFS to BFS',      'BFS when the answer involves shortest distance in unweighted graph; DFS when discovery order matters.', 'next: in 6 days', 'created 2w ago'],
            ['syntax',    'C++ lower_bound on pairs',            'Compares lexicographically; supply a custom Compare to bound on second element only.',  'next: in 5 days', 'created 3d ago'],
            ['knowledge', 'Bit-by-bit prefix sum',               'Sum across each bit-plane independently, then combine. O(30·n) for ints.',           'overdue · 1d',  'created 6d ago'],
            ['pitfall',   'Integer overflow in 1e9·1e9',         'Cast to int64 BEFORE multiplying. The multiplication itself overflows int32.',       'next: in 2 days', 'created 5d ago'],
          ].map((c, i) => (
            <IndexCard key={i} type={c[0]} title={c[1]} body={c[2]} schedule={c[3]} created={c[4]} />
          ))}
        </div>
      </div>
      <Caption>fig. 1 — sorted by next-review date. Filter by tag, type, or due-date above.</Caption>

      {/* §03 Create */}
      <SectionRule
        kicker="§ 03"
        title="A new card, with help"
        right={<Chip>AI-assisted</Chip>}
      />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56,
        padding: '32px var(--space-page) 0',
      }}>
        <div>
          <Annot>step 1 · seed</Annot>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1.6,
            color: 'var(--ink-2)', marginTop: 6,
          }}>
            Drop a problem number, a one-line note, or both. The AI will draft
            a card with type, summary, common pitfalls, and similar problems —
            you keep, edit, or rewrite each.
          </p>
          <div style={{
            marginTop: 18, padding: '14px 16px',
            background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 2,
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)',
          }}>
            1547D &nbsp;·&nbsp; "kept getting WA on edge case k=1, parity confused me"
          </div>
          <Btn primary style={{ marginTop: 16 }}>Draft card with AI {Glyph.arrowRight}</Btn>
        </div>

        <div>
          <Annot>step 2 · draft (auto-filled)</Annot>
          <DraftCard />
        </div>
      </div>

      {/* footnotes */}
      <div style={{
        margin: '64px var(--space-page) 56px', paddingTop: 16,
        borderTop: 'var(--rule) var(--rule-style) var(--line)',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)',
        color: 'var(--mute)', lineHeight: 1.7,
      }}>
        <sup>1</sup>&nbsp; sm-2 schedule with friction modifier. cards you call "blurry" come back faster than vanilla anki.<br />
        <sup>2</sup>&nbsp; auto-fill model: gemini · 1.8s avg · you can override every field before saving.
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

function CardStack() {
  return (
    <div style={{ position: 'relative', height: 360, paddingLeft: 24, paddingTop: 16 }}>
      {[3, 2, 1].map((i) => (
        <div key={i} style={{
          position: 'absolute', left: 24 + i * 6, top: 16 - i * 4,
          right: 80 + i * 8, height: 320,
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 3,
          transform: `rotate(${i * 0.6}deg)`, opacity: 1 - i * 0.18, zIndex: 10 - i,
        }} />
      ))}
      <div style={{
        position: 'absolute', left: 24, top: 16, right: 80, height: 320,
        background: 'var(--card)', border: '1px solid var(--ink)', borderRadius: 3,
        boxShadow: '0 4px 14px rgba(0,0,0,.06)', zIndex: 20,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          height: 28, borderBottom: '1px solid var(--line)', padding: '0 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '.14em',
        }}>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>· pitfall</span>
          <span style={{ color: 'var(--mute)' }}>card 7 of 312 · interval 4d</span>
        </div>
        <div style={{
          flex: 1, padding: '32px 36px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <Annot>front · question</Annot>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.25,
            fontStyle: 'italic',
          }}>
            In a difference array, when I do <span style={{ fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: 24 }}>diff[r+1] -= x</span>,
            why does that <em>r+1</em> matter — what breaks if I write <span style={{ fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: 24 }}>diff[r]</span>?
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mute)',
            }}>tap card to flip · or press space</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)',
            }}>flip {Glyph.arrowRight}</span>
          </div>
        </div>
      </div>
      <div style={{
        position: 'absolute', right: 0, top: 16, width: 60, height: 320,
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 30,
      }}>
        {[['✓', 'remember'], ['◇', 'blurry'], ['×', 'forgot']].map((r) => (
          <button key={r[1]} style={{
            flex: 1, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 3,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 6,
            cursor: 'pointer', fontFamily: 'var(--font-mono)',
          }}>
            <span style={{ fontSize: 22 }}>{r[0]}</span>
            <span style={{
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--mute)',
            }}>{r[1]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function IndexCard({ type, title, body, schedule, created }) {
  const overdue = schedule.includes('overdue');
  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${overdue ? 'var(--ink)' : 'var(--line)'}`, borderRadius: 3,
      display: 'flex', flexDirection: 'column', minHeight: 200,
      boxShadow: '0 1px 3px rgba(0,0,0,.04)',
    }}>
      <div style={{
        height: 24, borderBottom: '1px solid var(--line-2)', padding: '0 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 9,
        textTransform: 'uppercase', letterSpacing: '.14em',
      }}>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>· {type}</span>
        <span style={{ color: 'var(--mute)' }}>{created}</span>
      </div>
      <div style={{
        padding: '14px 16px', flex: 1,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{body}</div>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          borderTop: '1px solid var(--line-2)', paddingTop: 8,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: overdue ? 'var(--ink)' : 'var(--mute)',
          }}>{schedule}</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)',
          }}>edit · review now {Glyph.arrowRight}</span>
        </div>
      </div>
    </div>
  );
}

function DraftCard() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px dashed var(--ink)', borderRadius: 3,
      padding: 0, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        height: 28, borderBottom: '1px solid var(--line)', padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        textTransform: 'uppercase', letterSpacing: '.14em',
      }}>
        <span style={{ color: 'var(--ink)' }}>· pitfall <span style={{ color: 'var(--mute)' }}>(ai · editable)</span></span>
        <span style={{ color: 'var(--mute)' }}>draft · unsaved</span>
      </div>
      <div style={{
        padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <Field2 kicker="title" value="Parity edge cases when k=1 in 1547D" />
        <Field2 kicker="front · question" value="When k=1, the parity argument collapses — why does the standard greedy fail, and what's the fix?" multi />
        <Field2 kicker="back · summary" value="Standard solution assumes pairs of adjacent flips. With k=1 you flip a single element, so parity invariants don't apply. Special-case it: each cell is independent." multi />
        <Field2 kicker="see also" value="1547B (similar parity), 1850D (greedy edge), card #84 (parity invariants)" />
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <Btn primary>Save card</Btn>
          <Btn>Regenerate with AI</Btn>
          <div style={{ flex: 1 }} />
          <Btn>Discard</Btn>
        </div>
      </div>
    </div>
  );
}

function Field2({ kicker, value, multi }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--mute-2)',
        marginBottom: 4,
      }}>{kicker}</div>
      <div style={{
        border: '1px solid var(--line)', padding: '8px 10px', borderRadius: 2,
        fontFamily: multi ? 'var(--font-ui)' : 'var(--font-mono)',
        fontSize: 'var(--type-body)', color: 'var(--ink)', lineHeight: 1.5,
        background: 'var(--card)',
      }}>{value}</div>
    </div>
  );
}
