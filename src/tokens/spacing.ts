/** Mirrors spacing.css 1:1 — for inline styles / JS-computed layout (canvas, three.js). */
export const space = {
  2: '2px',
  3: '3px',
  4: '4px',
  5: '5px',
  6: '6px',
  7: '7px',
  8: '8px',
  10: '10px',
  12: '12px',
  14: '14px',
  16: '16px',
  18: '18px',
  20: '20px',
  22: '22px',
  24: '24px',
  26: '26px',
  28: '28px',
  32: '32px',
  36: '36px',
  40: '40px',
  44: '44px',
  48: '48px',
  60: '60px',
  100: '100px',
  120: '120px',
  140: '140px',
} as const;

/** Fluid gutters reused structurally across sections (container/nav horizontal padding). */
export const fluidSpace = {
  containerX: 'clamp(20px, 6vw, 80px)',
  navX: 'clamp(20px, 5vw, 64px)',
} as const;
