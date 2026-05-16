import Masthead from './Masthead';

export default function AppLayout({ children }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
      <Masthead />
      <main>{children}</main>
    </div>
  );
}
