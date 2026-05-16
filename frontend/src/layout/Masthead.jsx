import { NavLink } from 'react-router-dom';
import Field from '../components/Field';

const links = [
  { to: '/',          label: 'Profile' },
  { to: '/training',  label: 'Training' },
  { to: '/knowledge', label: 'Knowledge' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/review',    label: 'Review' },
  { to: '/compare',   label: 'Compare' },
  { to: '/settings',  label: 'Settings' },
];

export default function Masthead() {
  const linkStyle = ({ isActive }) => ({
    color: isActive ? 'var(--ink)' : 'var(--mute)',
    borderBottom: isActive ? '1px solid var(--ink)' : '1px solid transparent',
    paddingBottom: 2,
    textDecoration: 'none',
  });

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'baseline',
        padding: '20px var(--space-page)',
        borderBottom: 'var(--rule) var(--rule-style) var(--line)',
        gap: 24,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--type-h3)',
          fontStyle: 'italic', letterSpacing: '-.02em',
        }}>
          codeforces<span style={{ color: 'var(--mute)' }}>/journal</span>
        </div>
        <div style={{ flex: 1 }} />
        <nav style={{
          display: 'flex', gap: 22, fontSize: 'var(--type-body)',
          fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em',
        }}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} style={linkStyle}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <Field label="HANDLE" value="Fuchsia_L" w={220} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '14px var(--space-page)',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)',
        textTransform: 'uppercase', letterSpacing: '.12em',
        color: 'var(--mute)',
        borderBottom: 'var(--rule) var(--rule-style) var(--line-2)',
      }}>
        <span>wednesday · may 13, 2026</span>
        <span>day 142 of training</span>
        <span>vol. 5 · stage 5/16</span>
      </div>
    </>
  );
}
