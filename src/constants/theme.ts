// ═══════════════════════════════════════════════════
// SoundMap by LevelPro Audio — Design System v2
// Dark Luxury · #1aff6e · Siempre dark
// ═══════════════════════════════════════════════════

export const C = {
  // Backgrounds
  bg:     '#06060a',
  bg1:    '#0a0a12',
  bg2:    '#0e0e1a',
  bg3:    '#141422',

  // Glass
  glass:  'rgba(255,255,255,0.04)',
  glass2: 'rgba(255,255,255,0.07)',
  glass3: 'rgba(255,255,255,0.11)',

  // Borders
  br:     'rgba(255,255,255,0.06)',
  br2:    'rgba(255,255,255,0.11)',
  br3:    'rgba(255,255,255,0.2)',

  // Accent — verde eléctrico
  ac:     '#1aff6e',
  ac2:    'rgba(26,255,110,0.12)',
  ac3:    'rgba(26,255,110,0.06)',
  ac4:    'rgba(26,255,110,0.03)',

  // Semánticos
  pu:     '#a78bfa',
  pu2:    'rgba(167,139,250,0.12)',
  bl:     '#60a5fa',
  bl2:    'rgba(96,165,250,0.12)',
  am:     '#fbbf24',
  am2:    'rgba(251,191,36,0.12)',
  rd:     '#ff4d4d',
  rd2:    'rgba(255,77,77,0.1)',

  // Text
  tx:     '#f0f0f0',
  t2:     '#8888a0',
  t3:     '#44445a',
  t4:     '#22223a',
} as const

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const

// ── Aliases backward-compat — para Card.tsx y componentes legacy ──
export const Colors = {
  accent:        '#1aff6e',
  accentDim:     'rgba(26,255,110,0.12)',
  accentGlow:    'rgba(26,255,110,0.25)',
  accentBorder:  'rgba(26,255,110,0.3)',
  background:    '#06060a',
  surface:       '#0e0e1a',
  surface2:      '#141422',
  glass:         'rgba(255,255,255,0.04)',
  glass2:        'rgba(255,255,255,0.07)',
  border:        'rgba(255,255,255,0.06)',
  border2:       'rgba(255,255,255,0.11)',
  border3:       'rgba(255,255,255,0.2)',
  textPrimary:   '#f0f0f0',
  textSecondary: '#8888a0',
  textTertiary:  '#44445a',
  success:       '#1aff6e',
  successBg:     'rgba(26,255,110,0.08)',
  warning:       '#fbbf24',
  warningBg:     'rgba(251,191,36,0.08)',
  danger:        '#ff4d4d',
  dangerBg:      'rgba(255,77,77,0.08)',
  info:          '#60a5fa',
  infoBg:        'rgba(96,165,250,0.08)',
  purple:        '#a78bfa',
  purpleBg:      'rgba(167,139,250,0.1)',
  amber:         '#fbbf24',
  amberBg:       'rgba(251,191,36,0.1)',
} as const

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
} as const

export const Radius = {
  sm: 6, md: 12, lg: 18, xl: 24, full: 9999,
} as const