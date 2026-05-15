// LevelPro Audio — Design System v2
// Dark Luxury · Verde eléctrico · Siempre dark

export const Colors = {
  // Accent — verde eléctrico LevelPro
  accent:        '#1aff6e',
  accentDim:     'rgba(26,255,110,0.12)',
  accentGlow:    'rgba(26,255,110,0.25)',
  accentBorder:  'rgba(26,255,110,0.3)',

  // Fondos
  background:    '#06060a',
  surface:       '#111118',
  surface2:      '#18181f',
  surface3:      '#1e1e28',

  // Glass
  glass:         'rgba(255,255,255,0.04)',
  glass2:        'rgba(255,255,255,0.07)',

  // Bordes
  border:        'rgba(255,255,255,0.06)',
  border2:       'rgba(255,255,255,0.11)',
  border3:       'rgba(255,255,255,0.2)',

  // Texto
  textPrimary:   '#f0f0f0',
  textSecondary: '#8888a0',
  textTertiary:  '#44445a',

  // Semánticos
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