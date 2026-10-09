/**
 * Assembly animation for one 3D case card (2026-09-26, per user request —
 * hybrid variant): the title and the teaser scatter/reassemble per letter /
 * per word, exactly the look of the site's own text assembly; badges, type,
 * metrics and links fly in as whole blocks (they carry borders/underlines that
 * a letter-scatter can't move). Deliberately NOT built on
 * useAssemblyAnimation: that engine scans the page once and keys off each
 * element's document position, but all four cards sit at the same place in the
 * pinned section — the caller drives this by an explicit 0..1 `a` per card.
 *
 * Markup contract (see WorkCylinder.tsx): `data-ag="<group 0..4>"` marks a
 * piece, `data-ak="b|l|w"` its kind — block / per-letter / per-word.
 * Groups play in order: badges+type → title → metrics → teaser → links.
 */

export interface CardAssembly {
  /** a: 0 = fully scattered, 1 = assembled (all inline styles removed, so the resting card is pixel-crisp). */
  update(a: number): void;
  dispose(): void;
}

interface Piece {
  el: HTMLElement;
  letter: boolean;
  /** Group order and index within it (blocks) / within the element (letters). */
  g: number;
  i: number;
  n: number;
  dx: number;
  dy: number;
  rot: number;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Each group starts this much later (in `a` units) than the previous one. */
const GROUP_STAGGER = 0.1;
const BLOCK_STAGGER = 0.04;
const BLOCK_SPAN = 0.5;
/** Letters of one element land in reading order across this extra window. */
const LETTER_SWEEP = 0.25;
const LETTER_SPAN = 0.45;

export function createCardAssembly(root: HTMLElement, seedKey: string): CardAssembly {
  const rand = rng(hash(seedKey));
  const pieces: Piece[] = [];
  const restores: Array<() => void> = [];
  const groupCount: Record<number, number> = {};

  root.querySelectorAll<HTMLElement>('[data-ag]').forEach((el) => {
    const g = Number(el.dataset.ag);
    const kind = el.dataset.ak;

    if (kind === 'b') {
      const i = groupCount[g] ?? 0;
      groupCount[g] = i + 1;
      pieces.push({ el, letter: false, g, i, n: 1, dx: (rand() - 0.5) * 24, dy: 16 + rand() * 14, rot: 0 });
      return;
    }

    const orig = el.firstChild;
    if (!orig || el.childNodes.length !== 1 || orig.nodeType !== 3) return;
    const text = orig.textContent ?? '';
    if (!text.trim()) return;

    const parts = kind === 'l' ? Array.from(text) : text.split(/(\s+)/).filter(Boolean);
    const frag = document.createDocumentFragment();
    const own: HTMLElement[] = [];
    parts.forEach((part) => {
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        return;
      }
      const sp = document.createElement('span');
      sp.textContent = part;
      sp.style.display = 'inline-block';
      sp.style.whiteSpace = 'pre';
      own.push(sp);
      frag.appendChild(sp);
    });
    if (!own.length) return;

    own.forEach((sp, i) => {
      pieces.push({ el: sp, letter: true, g, i, n: own.length, dx: (rand() - 0.5) * 70, dy: (rand() - 0.5) * 50, rot: (rand() - 0.5) * 30 });
    });
    // Keep the ORIGINAL text node (React holds a reference to it) and put it
    // back on dispose, instead of re-creating text.
    el.replaceChildren(frag);
    restores.push(() => el.replaceChildren(orig));
  });

  let last = NaN;

  const clearAll = () => {
    pieces.forEach((p) => {
      p.el.style.transform = '';
      p.el.style.opacity = '';
    });
  };

  return {
    update(a) {
      if (a === last) return;
      last = a;
      if (a >= 0.999) {
        clearAll();
        return;
      }
      pieces.forEach((p) => {
        const sweep = p.letter ? (p.i / Math.max(1, p.n)) * LETTER_SWEEP : p.i * BLOCK_STAGGER;
        const start = p.g * GROUP_STAGGER + sweep;
        const span = p.letter ? LETTER_SPAN : BLOCK_SPAN;
        const raw = (a - start) / span;
        if (raw >= 1) {
          p.el.style.transform = '';
          p.el.style.opacity = '';
          return;
        }
        const e = easeOut(clamp01(raw));
        const k = 1 - e;
        p.el.style.transform = `translate3d(${(p.dx * k).toFixed(2)}px, ${(p.dy * k).toFixed(2)}px, 0) rotate(${(p.rot * k).toFixed(2)}deg)`;
        // Fully invisible at a = 0 (nothing may preview before the card has landed).
        p.el.style.opacity = e.toFixed(3);
      });
    },
    dispose() {
      clearAll();
      restores.forEach((r) => r());
    },
  };
}
