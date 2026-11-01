import type { TokenName } from './generated';

/** CSS references keep inline styles connected to responsive and scoped tokens. */
export function token<Name extends TokenName>(name: Name): `var(--${Name})` {
  return `var(--${name})`;
}

/** Resolve CSS tokens when an API (Canvas/Three.js) requires concrete values. */
export function readToken(name: TokenName, element?: Element): string {
  if (typeof document === 'undefined') throw new Error('readToken requires a browser; use runtimeTokens outside the DOM');
  const value = getComputedStyle(element ?? document.documentElement).getPropertyValue(`--${name}`).trim();
  if (!value) throw new Error(`CSS token --${name} is not loaded`);
  return value;
}

export function readTokenNumber(name: TokenName, element?: Element): number {
  const value = Number.parseFloat(readToken(name, element));
  if (!Number.isFinite(value)) throw new Error(`Token ${name} is not numeric`);
  return value;
}
