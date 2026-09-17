/**
 * Mirrors colors.css 1:1. Numeric hex variants are for three.js (Color/Material
 * constructors take numbers, not CSS strings) and canvas 2d contexts.
 */
export const colors = {
  blueprint: '#0e1b2e',
  redline: '#e8432b',
  vellum: '#f2f0eb',
  slateMist: '#8a96a6',
  graphite: '#1b2a3f',
  vellumMuted: '#c8cdd6',
  slateMistDim: '#5c6675',
} as const;

export const colorsNumeric = {
  blueprint: 0x0e1b2e,
  redline: 0xe8432b,
  vellum: 0xf2f0eb,
  slateMist: 0x8a96a6,
  graphite: 0x1b2a3f,
  vellumMuted: 0xc8cdd6,
  slateMistDim: 0x5c6675,
} as const;

export type ColorToken = keyof typeof colors;
