// GENERATED compatibility exports; values come from design-tokens.json.
export const colors = {
  "blueprint": "#000000",
  "redline": "#f5f5f7",
  "accent": "#e4e4e7",
  "glow": "#d4d4dc",
  "glowLight": "#f4f4f6",
  "vellum": "#f5f5f7",
  "slateMist": "#a1a1aa",
  "graphite": "#202024",
  "vellumMuted": "#d4d4d8",
  "slateMistDim": "#71717a",
} as const;
export type ColorToken = keyof typeof colors;
export const colorsNumeric = Object.fromEntries(Object.entries(colors).map(([key, hex]) => [key, parseInt(hex.slice(1), 16)])) as Record<ColorToken, number>;
