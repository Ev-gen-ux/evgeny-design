/** Shared pure helpers — byte-identical across both assembly implementations in the source (Portfolio.dc.html and Case Study.dc.html). */

export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 99991);
}

export function asmSeed(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  const r1 = s / 233280;
  s = (s * 9301 + 49297) % 233280;
  const r2 = s / 233280;
  s = (s * 9301 + 49297) % 233280;
  const r3 = s / 233280;
  s = (s * 9301 + 49297) % 233280;
  const r4 = s / 233280;
  return { r1, r2, r3, r4 };
}

export function docTop(el: HTMLElement): number {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return y;
}

export interface SpanDelta {
  dx: number;
  dy: number;
  rot: number;
  sc: number;
}

export interface AsmSpan extends HTMLSpanElement {
  __d?: SpanDelta;
}
