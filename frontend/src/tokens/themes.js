// Token names are frozen — only values vary across themes.
// Layout-affecting tokens (sizes, line-heights, radius, avatar) are shared
// across all themes via SCALE so theme switches don't reflow. Fonts and
// colors are the only per-theme variations.

const SCALE = {
  '--type-hero': '84px', '--type-h1': '56px', '--type-h2': '32px', '--type-h3': '22px',
  '--type-lede': '18px', '--type-body': '13px', '--type-meta': '11px', '--type-micro': '10px',
  '--leading-display': '1.05', '--leading-h2': '1.2', '--leading-body': '1.55',
  '--track-display': '-0.025em', '--track-meta': '0.12em',
  '--rule': '1px', '--rule-strong': '1px', '--rule-style': 'solid',
  '--radius': '2px', '--avatar': '32px',
  '--display-style': 'normal', '--lede-style': 'italic',
};

// CJK fallbacks: serif → Songti/Source Han Serif (Mac) / SimSun (Win) · sans →
// PingFang (Mac/iOS) / Microsoft YaHei (Win) / Source Han Sans (Linux). Latin
// fonts are listed first so per-character cascade picks them for ASCII; CJK
// glyphs fall through to whichever Chinese font the platform has.
const FONT_EDITORIAL = {
  '--font-display': 'Georgia, "Source Han Serif SC", "Songti SC", "STSong", SimSun, serif',
  '--font-body':    'Georgia, "Source Han Serif SC", "Songti SC", "STSong", SimSun, serif',
  '--font-ui':      '"Inter", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", -apple-system, system-ui, sans-serif',
  '--font-mono':    '"JetBrains Mono", "Sarasa Mono SC", Consolas, ui-monospace, Menlo, monospace',
};
const FONT_MONO = {
  '--font-display': '"JetBrains Mono", "Sarasa Mono SC", Consolas, ui-monospace, Menlo, monospace',
  '--font-body':    '"JetBrains Mono", "Sarasa Mono SC", Consolas, ui-monospace, Menlo, monospace',
  '--font-ui':      '"JetBrains Mono", "Sarasa Mono SC", Consolas, ui-monospace, Menlo, monospace',
  '--font-mono':    '"JetBrains Mono", "Sarasa Mono SC", Consolas, ui-monospace, Menlo, monospace',
};

export const THEMES = {
  // ── Light ──────────────────────────────────────────────────────────────
  'editorial-rose': {
    ...SCALE, ...FONT_EDITORIAL,
    // B · warm-neutral paper · oxblood + deep teal · editorial, not corporate
    '--ink': '#1c1814', '--ink-2': '#3d3630', '--mute': '#7a716a', '--mute-2': '#aaa39c',
    '--line': '#dcd6cd', '--line-2': '#ebe7df', '--bg': '#f6f1ec', '--card': '#fcf9f5',
    '--hatch': '#eee8df', '--rule-ink': '#1c1814',
    '--accent': '#7c2d3a', '--accent-2': '#2f6b66',
  },
  'paper-clean': {
    ...SCALE, ...FONT_EDITORIAL,
    // C · desaturated paper · slate-blue + terracotta
    '--ink': '#1f1d1a', '--ink-2': '#403c36', '--mute': '#8a8174', '--mute-2': '#b8b0a3',
    '--line': '#d4cdbf', '--line-2': '#e5dfd2', '--bg': '#f3ede1', '--card': '#faf6ec',
    '--hatch': '#ebe3d2', '--rule-ink': '#1f1d1a',
    '--accent': '#1f5e7a', '--accent-2': '#a85530',
  },
  'duo-indigo-rose': {
    ...SCALE, ...FONT_EDITORIAL,
    // L · cool paper · deep indigo + dusty rose · classic editorial duotone
    '--ink': '#161821', '--ink-2': '#3a3d4d', '--mute': '#76798a', '--mute-2': '#a8abb8',
    '--line': '#dcdbe2', '--line-2': '#ececef', '--bg': '#f5f4f0', '--card': '#fbfaf7',
    '--hatch': '#ebe9e3', '--rule-ink': '#161821',
    '--accent': '#3a3a8e', '--accent-2': '#b85a6e',
  },

  // ── Dark ───────────────────────────────────────────────────────────────
  'terminal-warm': {
    ...SCALE, ...FONT_MONO,
    // E · warm black · amber + sage · Kindle-night for late grinding
    '--ink': '#ebe3d7', '--ink-2': '#b8ad9d', '--mute': '#7a6f60', '--mute-2': '#4f4639',
    '--line': '#2c2620', '--line-2': '#1c1814', '--bg': '#16120f', '--card': '#1d1814',
    '--hatch': '#231d18', '--rule-ink': '#ebe3d7',
    '--accent': '#d4a574', '--accent-2': '#8aac80',
  },
  'terminal-sage': {
    ...SCALE, ...FONT_MONO,
    // J · sage green · sage + warm coral · keeps "terminal = green" DNA, drops CRT
    '--ink': '#dce5dc', '--ink-2': '#a8b5a8', '--mute': '#6b7a6b', '--mute-2': '#4a554a',
    '--line': '#253028', '--line-2': '#1a221c', '--bg': '#0f1612', '--card': '#161e18',
    '--hatch': '#1c2620', '--rule-ink': '#dce5dc',
    '--accent': '#7fb89a', '--accent-2': '#d48a7a',
  },
  'cf-violet-dark': {
    ...SCALE, ...FONT_MONO,
    // H · deep plum-slate · CF violet + amber · "expert tier" mood, no CRT
    '--ink': '#e6e0f0', '--ink-2': '#b3aac4', '--mute': '#7a708d', '--mute-2': '#564d68',
    '--line': '#2a2438', '--line-2': '#1c1827', '--bg': '#100d18', '--card': '#1a1626',
    '--hatch': '#221d31', '--rule-ink': '#e6e0f0',
    '--accent': '#a888e8', '--accent-2': '#e0b56b',
  },
};

export const DENSITIES = {
  compact: { '--space-page': '32px', '--space-section': '24px', '--space-row': '12px', '--space-tight': '8px', '--space-gap': '32px' },
  cozy: { '--space-page': '48px', '--space-section': '36px', '--space-row': '18px', '--space-tight': '12px', '--space-gap': '48px' },
  spacious: { '--space-page': '64px', '--space-section': '48px', '--space-row': '24px', '--space-tight': '16px', '--space-gap': '64px' },
};
