/**
 * Mirrors colors.css 1:1. Numeric hex variants are for three.js (Color/Material
 * constructors take numbers, not CSS strings) and canvas 2d contexts.
 *
 * 2026-10-24 — Portfolio Design Kit palette (replaces the earlier ad-hoc blue
 * remap). `redline` stays the raw hue for ChatBar/AgentSessionTimeline status
 * dots — it is not the accent. The accent is `accent` (green-400, matching
 * colors.css's `--color-accent`). `glow`/`glowLight` (mauve) are for the new
 * grain-gradient background only.
 */
export const colors = {
  blueprint: '#08161c',
  redline: '#e8432b',
  accent: '#7eaa94',
  glow: '#d0b3ac',
  glowLight: '#e8d0c4',
  vellum: '#f4f7f7',
  slateMist: '#94a1a5',
  graphite: '#243845',
  vellumMuted: '#d3d7d7',
  slateMistDim: '#536672',
} as const;

export const colorsNumeric = {
  blueprint: 0x08161c,
  redline: 0xe8432b,
  accent: 0x7eaa94,
  glow: 0xd0b3ac,
  glowLight: 0xe8d0c4,
  vellum: 0xf4f7f7,
  slateMist: 0x94a1a5,
  graphite: 0x243845,
  vellumMuted: 0xd3d7d7,
  slateMistDim: 0x536672,
} as const;

export type ColorToken = keyof typeof colors;
