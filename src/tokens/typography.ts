/** Mirrors typography.css 1:1 — for JS-driven text (mono readout, canvas labels). */
export const fontFamily = {
  display: "'Space Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

export const fontSize = {
  micro: '9px',
  tiny: '10px',
  xs: '11px',
  sm: '12px',
  smMd: '13px',
  base: '14px',
  md: '15px',
  lg: '16px',
  xl: '19px',
  xxl: '22px',
  fluidXs: 'clamp(16px, 2vw, 20px)',
  fluidSm: 'clamp(17px, 2.2vw, 24px)',
  fluidCsSubtitle: 'clamp(17px, 1.7vw, 21px)',
  fluidSectionHeading: 'clamp(24px, 3vw, 32px)',
  fluidMdAlt: 'clamp(24px, 3vw, 36px)',
  fluidLgA: 'clamp(26px, 3.2vw, 44px)',
  fluidCsHeading: 'clamp(26px, 3.4vw, 38px)',
  fluidLgB: 'clamp(28px, 4vw, 44px)',
  fluidCsMetric: 'clamp(22px, 3vw, 30px)',
  fluidXl: 'clamp(32px, 6vw, 72px)',
  fluidCsHero: 'clamp(32px, 5vw, 58px)',
  fluidHero: 'clamp(44px, 8.5vw, 112px)',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const tracking = {
  tightest: '-0.02em',
  tighter: '-0.015em',
  tight: '-0.01em',
  wide: '0.05em',
  wider: '0.06em',
  widest: '0.08em',
} as const;

export const lineHeight = {
  tight: 1.08,
  snug: 1.4,
  normal: 1.5,
  relaxedSm: 1.55,
  relaxed: 1.6,
  relaxedMd: 1.65,
  loose: 1.7,
  looser: 1.75,
} as const;
