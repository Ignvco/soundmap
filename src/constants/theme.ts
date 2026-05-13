export const Colors = {
  // Accent — SoundMap red
  accent: "#C00020",
  accentBg: "#FFF0F0",
  accentBorder: "#F0B0B0",

  // Semantic
  success: "#1a7a3c",
  successBg: "#f0faf4",
  warning: "#7a5800",
  warningBg: "#fffbf0",
  info: "#1a4fa0",
  infoBg: "#f0f4ff",

  // Neutral
  background: "#ffffff",
  surface: "#f7f7f5",
  surface2: "#f0f0ec",
  border: "#e8e8e4",
  borderDark: "#d0d0c8",
  textPrimary: "#111110",
  textSecondary: "#6b6b68",
  textTertiary: "#9b9b98",
} as const;

export const ColorsDark = {
  ...Colors,
  accentBg: "#2a0008",
  background: "#111110",
  surface: "#1a1a18",
  surface2: "#222220",
  border: "#2a2a28",
  textPrimary: "#e8e8e0",
  textSecondary: "#888880",
  textTertiary: "#555550",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;
