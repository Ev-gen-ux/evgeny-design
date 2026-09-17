import { useEffect, type RefObject } from 'react';
import { seedOf, asmSeed, type AsmSpan } from './asmMath';

/**
 * Small, standalone letter-scatter assembly for MobileNavOverlay's link list
 * — same visual math as useAssemblyAnimation's driveAsm (per-letter scatter
 * → reassemble, seeded random offsets, quintic ease-out), but triggered by
 * the overlay mounting (a state transition — the menu opening), not scroll
 * position. useAssemblyAnimation/useCaseStudyAssembly both scan + measure
 * the DOM exactly once for the page's lifetime (a page-load assumption) —
 * doesn't fit a component that mounts fresh every time the menu opens, so
 * this re-splits and re-animates from scratch on every mount instead of
 * trying to reuse either of those hooks directly.
 *
 * Candidates are elements carrying `data-menu-asm` inside `containerRef`
 * (MobileNavOverlay marks each link's text span this way) — deliberately a
 * narrow, explicit opt-in rather than a DOM scan, since this always runs
 * against the same small, known set of links.
 *
 * `open` (2026-09-17 follow-up): MobileNavOverlay is now always mounted
 * (slides off-screen via CSS rather than unmounting, so its own exit
 * transition can play) — this hook re-runs the split+scatter-in every time
 * `open` flips true, instead of only ever once at mount.
 */
export function useMenuAssembly(containerRef: RefObject<HTMLElement | null>, reducedMotion: boolean, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const cands = container.querySelectorAll<HTMLElement>('[data-menu-asm]');
    const units: { spans: AsmSpan[] }[] = [];

    cands.forEach((el, unitIdx) => {
      const text = el.textContent || '';
      if (!text.trim()) return;
      const frag = document.createDocumentFragment();
      const spans: AsmSpan[] = [];
      const seedI = seedOf('menu:' + unitIdx + ':' + text);
      let idx = 0;
      text.split('').forEach((ch) => {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(ch));
          return;
        }
        const sp = document.createElement('span') as AsmSpan;
        sp.textContent = ch;
        sp.style.display = 'inline-block';
        sp.style.whiteSpace = 'pre';
        const r = asmSeed(seedI + idx++ * 37 + 11);
        sp.__d = { dx: (r.r1 - 0.5) * 2, dy: (r.r2 - 0.5) * 2, rot: (r.r3 - 0.5) * 2, sc: 0.4 + r.r4 * 0.5 };
        spans.push(sp);
        frag.appendChild(sp);
      });
      el.textContent = '';
      el.appendChild(frag);
      units.push({ spans });
    });

    if (reducedMotion) {
      units.forEach((u) => u.spans.forEach((sp) => {
        sp.style.opacity = '1';
        sp.style.transform = 'none';
      }));
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const t0 = performance.now();
    // 2x slower than the initial 750ms (2026-09-17, explicit user request —
    // "ещё в 2 раза плавнее").
    const DURATION = 1500;
    let raf = 0;

    const tick = () => {
      const now = performance.now();
      const raw = Math.min(1, (now - t0) / DURATION);
      const le = raw * raw * (3 - 2 * raw);
      units.forEach((u) => {
        const n = u.spans.length;
        const stagger = n > 1 ? Math.min(0.5 / (n - 1), 0.05) : 0;
        const span = 1 - stagger * (n - 1);
        for (let j = 0; j < n; j++) {
          const sp = u.spans[j];
          const d = sp.__d!;
          const cT = Math.max(0, Math.min(1, (le - j * stagger) / span));
          const eT = 1 - Math.pow(1 - cT, 5);
          const k = 1 - eT;
          if (k < 0.002) {
            sp.style.opacity = '1';
            sp.style.transform = 'none';
            continue;
          }
          sp.style.opacity = Math.min(1, eT * 1.3).toFixed(3);
          sp.style.transform =
            'translate(' +
            (d.dx * vw * 0.06 * k).toFixed(2) +
            'px,' +
            (d.dy * vh * 0.08 * k).toFixed(2) +
            'px) rotate(' +
            (d.rot * 10 * k).toFixed(2) +
            'deg) scale(' +
            (1 - (1 - d.sc) * k * 0.5).toFixed(4) +
            ')';
        }
      });
      if (raw < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [containerRef, reducedMotion, open]);
}
