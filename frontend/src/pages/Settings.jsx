import Btn from '../components/Btn';
import Chip from '../components/Chip';
import PageHead from '../components/PageHead';
import SectionRule from '../components/SectionRule';
import { useTheme } from '../tokens/ThemeProvider';

function ChipGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Chip
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={active
              ? { background: 'var(--ink)', color: 'var(--card)', borderColor: 'var(--ink)', cursor: 'pointer' }
              : { background: 'var(--card)', color: 'var(--ink-2)', borderColor: 'var(--line)', cursor: 'pointer' }}
          >
            {opt.label}
          </Chip>
        );
      })}
    </div>
  );
}

const THEME_OPTIONS = [
  { value: 'editorial-rose',  label: 'Editorial · Rose' },
  { value: 'paper-clean',     label: 'Paper · Clean' },
  { value: 'duo-indigo-rose', label: 'Indigo + Rose' },
  { value: 'terminal-warm',   label: 'Terminal · Warm' },
  { value: 'terminal-sage',   label: 'Terminal · Sage' },
  { value: 'cf-violet-dark',  label: 'CF Violet' },
];

const DENSITY_OPTIONS = [
  { value: 'compact',  label: 'Compact' },
  { value: 'cozy',     label: 'Cozy' },
  { value: 'spacious', label: 'Spacious' },
];

const THEME_LABELS = Object.fromEntries(THEME_OPTIONS.map((o) => [o.value, o.label]));
const DENSITY_LABELS = Object.fromEntries(DENSITY_OPTIONS.map((o) => [o.value, o.label]));

export default function Settings() {
  const { theme, density, setTheme, setDensity } = useTheme();

  return (
    <div style={{
      fontFamily: 'var(--font-ui)', fontSize: 'var(--type-body)',
      lineHeight: 'var(--leading-body)',
    }}>
      <PageHead
        kicker="settings"
        title={<>Tune the journal.</>}
        lede={<>Most of these you set once. The training preferences quietly shape what the recommender shows you tomorrow.</>}
      />

      <SectionRule kicker="§ 01" title="Account" />
      <Rows>
        <Row label="Codeforces handle" value="Fuchsia_L" right={<Btn>Verify</Btn>} hint="Re-verifies via the CF API · last sync 2 min ago" />
        <Row label="Display name" value="Iris" />
        <Row label="Time zone" value="Asia/Shanghai · UTC+8" />
        <Row label="Email" value="—" hint="Optional · used only for weekly digest" />
      </Rows>

      <SectionRule kicker="§ 02" title="AI" />
      <Rows>
        <Row label="Auto-classify submissions" value="On" toggle />
        <Row label="Auto-fill new cards" value="On" toggle hint="Drafts the body, you accept or rewrite" />
        <Row
          label="Model"
          value="Gemini 2.5 Pro"
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip style={{ background: 'var(--ink)', color: 'var(--card)', borderColor: 'var(--ink)' }}>Gemini</Chip>
              <Chip>GPT-4</Chip>
              <Chip>Claude</Chip>
            </div>
          }
        />
        <Row label="API endpoint" value="https://your-proxy.example.com/v1" hint="Your own endpoint · key never leaves the browser" />
      </Rows>

      <SectionRule kicker="§ 03" title="Training" />
      <Rows>
        <Row
          label="Difficulty offset"
          value="+100"
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip>−200</Chip>
              <Chip>−100</Chip>
              <Chip style={{ background: 'var(--ink)', color: 'var(--card)', borderColor: 'var(--ink)' }}>+100</Chip>
              <Chip>+200</Chip>
            </div>
          }
          hint="Recommender will favor problems this much above your current rating"
        />
        <Row label="Skipped tags" value="game-theory · interactive" right={<Btn>Edit list</Btn>} />
        <Row
          label="Daily review cap"
          value="20 cards"
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip>10</Chip>
              <Chip style={{ background: 'var(--ink)', color: 'var(--card)', borderColor: 'var(--ink)' }}>20</Chip>
              <Chip>40</Chip>
              <Chip>no cap</Chip>
            </div>
          }
        />
      </Rows>

      <SectionRule kicker="§ 04" title="Appearance" />
      <Rows>
        <Row
          label="Theme"
          value={THEME_LABELS[theme]}
          right={<ChipGroup options={THEME_OPTIONS} value={theme} onChange={setTheme} />}
        />
        <Row
          label="Density"
          value={DENSITY_LABELS[density]}
          right={<ChipGroup options={DENSITY_OPTIONS} value={density} onChange={setDensity} />}
        />
        <Row
          label="Rating colors"
          value="CF official"
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip style={{ background: 'var(--ink)', color: 'var(--card)', borderColor: 'var(--ink)' }}>CF</Chip>
              <Chip>Desaturated</Chip>
              <Chip>Mono</Chip>
            </div>
          }
          hint="Affects every rating badge across the journal"
        />
      </Rows>

      <SectionRule
        kicker="§ 05"
        title="Data"
        right={
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute)',
          }}>14.2 MB · 312 cards · 1240 submissions</span>
        }
      />
      <Rows>
        <Row label="Export" value="JSON" right={<Btn>Download .json</Btn>} hint="Cards, training state, AI classifications. CF data is fetched fresh." />
        <Row label="Import" value="—" right={<Btn>Choose file…</Btn>} />
        <Row label="Re-classify all submissions" value="—" hint="Moved to Danger zone below — has API cost." />
        <Row label="Reset training progress" value="—" hint="Moved to Danger zone below." />
      </Rows>

      <SectionRule
        kicker="§ 06"
        title="Danger zone"
        right={
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--mute)',
          }}>destructive or costly</span>
        }
      />
      <Rows>
        <Row
          label="Re-classify all submissions"
          value="~1,240 calls"
          right={<Btn style={{ borderColor: 'var(--ink)' }}>Run now…</Btn>}
          hint="Re-runs the AI tagger over your full submission history. Cost estimate: ~1,240 model calls · ~$0.18 at current rates · ~2 min. You'll be asked to confirm."
        />
        <Row
          label="Reset training progress"
          value="—"
          right={<Btn style={{ borderColor: 'var(--ink)' }}>Reset…</Btn>}
          hint="Stage progress only — submissions and cards untouched."
        />
      </Rows>

      <div style={{ height: 80 }} />
    </div>
  );
}

function Rows({ children }) {
  return <div style={{ padding: '8px var(--space-page) 0' }}>{children}</div>;
}

function Row({ label, value, right, hint, toggle }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '260px 1fr auto', gap: 32,
      padding: '20px 0',
      borderTop: 'var(--rule) var(--rule-style) var(--line-2)',
      alignItems: 'baseline',
    }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.3 }}>{label}</div>
        {hint && (
          <div style={{
            fontSize: 'var(--type-body)', color: 'var(--mute)', marginTop: 4, lineHeight: 1.5,
          }}>{hint}</div>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body)', color: 'var(--ink-2)',
      }}>{value}</div>
      <div>{toggle ? <Toggle on={value === 'On'} /> : right}</div>
    </div>
  );
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 44, height: 24, borderRadius: 12, border: '1px solid var(--ink)',
      background: on ? 'var(--ink)' : 'var(--card)', position: 'relative', cursor: 'pointer',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 22 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: on ? 'var(--card)' : 'var(--ink)', transition: 'left .18s',
      }} />
    </div>
  );
}
