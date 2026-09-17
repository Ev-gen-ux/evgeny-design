/**
 * Mirrors motion.css 1:1, plus JS-only timing constants that don't exist as CSS
 * transitions in the current site (raf-driven loops read these as numbers/ms).
 */
export const duration = {
  150: '0.15s',
  180: '0.18s',
  200: '0.2s',
  250: '0.25s',
  300: '0.3s',
  350: '0.35s',
  400: '0.4s',
  500: '0.5s',
  700: '0.7s',
  1100: '1.1s',
  ambient7s: '7s',
  ambient20s: '20s',
  ambient26s: '26s',
  ambient50s: '50s',
} as const;

/** Same steps in ms, for requestAnimationFrame-driven JS (three.js, canvas, assembly loop). */
export const durationMs = {
  150: 150,
  180: 180,
  200: 200,
  250: 250,
  300: 300,
  350: 350,
  400: 400,
  500: 500,
  700: 700,
  1100: 1100,
  ambient7s: 7000,
  ambient20s: 20000,
  ambient26s: 26000,
  ambient50s: 50000,
} as const;

/** _asmRaf load-in progress window from the current assembly-loop implementation. */
export const assemblyLoadDurationMs = 2600;

export const easing = {
  linear: 'linear',
  standard: 'ease',
  inOut: 'ease-in-out',
  out: 'ease-out',
  signature: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/** Control points for the signature curve, for JS-side easing (three.js/canvas raf loops). */
export const signatureEasingPoints = [0.16, 1, 0.3, 1] as const;
