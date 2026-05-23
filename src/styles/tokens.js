// ══════════════════════════════════════════════════════════════════
// CipherPool — Design System Tokens  (JS source of truth)
// CSS variables in index.css mirror these values.
// Use these for inline styles / dynamic styling in JS.
// ══════════════════════════════════════════════════════════════════

export const BG = {
  base:     '#0B1020',   // root page background — deep navy, not black
  layer1:   '#12182B',   // secondary surfaces, sidebar
  card:     '#161D33',   // cards, panels
  elevated: '#1B2440',   // modals, dropdowns, raised panels
  overlay:  '#1F2A4A',   // highest elevation
}

export const TEXT = {
  primary:   '#F8FAFC',   // headings, key values
  secondary: '#CBD5E1',   // body, descriptions
  muted:     '#94A3B8',   // labels, placeholders
  disabled:  '#64748B',   // disabled / hint
}

export const ACCENT = {
  purple:  '#7C3AED',   // CipherPool brand
  purpleDim:  'rgba(124,58,237,0.12)',
  purpleGlow: 'rgba(124,58,237,0.35)',
  purpleBorder:'rgba(124,58,237,0.25)',

  cyan:    '#06B6D4',
  cyanDim:   'rgba(6,182,212,0.12)',
  cyanGlow:  'rgba(6,182,212,0.35)',

  green:   '#10B981',   // success, online
  greenDim:  'rgba(16,185,129,0.12)',
  greenGlow: 'rgba(16,185,129,0.30)',

  red:     '#EF4444',   // danger, offline
  redDim:    'rgba(239,68,68,0.10)',

  orange:  '#F59E0B',   // warning, gold
  orangeDim: 'rgba(245,158,11,0.12)',
  orangeGlow:'rgba(245,158,11,0.30)',
}

export const BORDER = {
  subtle: 'rgba(255,255,255,0.05)',
  base:   'rgba(255,255,255,0.08)',
  strong: 'rgba(255,255,255,0.13)',
  active: 'rgba(124,58,237,0.40)',
}

export const SHADOW = {
  sm:     '0 1px 4px rgba(0,0,0,0.5)',
  md:     '0 4px 20px rgba(0,0,0,0.5)',
  lg:     '0 12px 48px rgba(0,0,0,0.6)',
  xl:     '0 24px 80px rgba(0,0,0,0.7)',
  purple: '0 0 24px rgba(124,58,237,0.30), 0 0 60px rgba(124,58,237,0.12)',
  cyan:   '0 0 24px rgba(6,182,212,0.30), 0 0 60px rgba(6,182,212,0.12)',
  green:  '0 0 20px rgba(16,185,129,0.25)',
  gold:   '0 0 20px rgba(245,158,11,0.25)',
  red:    '0 0 20px rgba(239,68,68,0.25)',
}

export const RADIUS = {
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '20px',
  xxl:  '24px',
  full: '99px',
}

export const TRANSITION = {
  fast:   '120ms cubic-bezier(0.16,1,0.3,1)',
  base:   '200ms cubic-bezier(0.16,1,0.3,1)',
  slow:   '350ms cubic-bezier(0.16,1,0.3,1)',
  spring: '300ms cubic-bezier(0.34,1.56,0.64,1)',
}

// ── Convenience: card base style (use with spread) ─────────────────
export const cardStyle = (elevated = false) => ({
  background: elevated ? BG.elevated : BG.card,
  border: `1px solid ${BORDER.base}`,
  borderRadius: RADIUS.xl,
})

// ── Convenience: glow button style ─────────────────────────────────
export const btnStyle = {
  primary: {
    background: `linear-gradient(135deg, ${ACCENT.purple}, #6D28D9)`,
    color: '#fff',
    boxShadow: `0 4px 20px ${ACCENT.purpleGlow}`,
  },
  cyan: {
    background: `linear-gradient(135deg, ${ACCENT.cyan}, #0891B2)`,
    color: '#000',
    boxShadow: `0 4px 20px ${ACCENT.cyanGlow}`,
  },
  ghost: {
    background: BORDER.subtle,
    color: TEXT.secondary,
    border: `1px solid ${BORDER.base}`,
  },
}
