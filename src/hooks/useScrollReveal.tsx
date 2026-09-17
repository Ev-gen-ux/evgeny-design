import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * 1:1 with updateAssembly()/rv() in Portfolio.dc.html. NOT IntersectionObserver
 * (the update-plan doc suggested IO, but the shipped site actually computes a
 * continuous 0..1 progress per `[data-reveal-id]` element from its scroll
 * position — a specific reveal *curve*, not a binary visible/hidden toggle — so
 * this ports the real formula for closer parity rather than approximating with IO).
 *
 * A single scroll listener scans every `[data-reveal-id]` element in the DOM
 * (matching the original's one global `updateAssembly()` walking the whole
 * root) and writes each element's opacity directly — no React Context/state
 * involved anymore (smoothness pass, 2026-08-02): this used to push progress
 * through a Context + setState on every scroll frame, which re-rendered every
 * consuming section whenever any tracked id's quantized value changed — during
 * active scrolling that's close to every animation frame. `useScrollReveal(id)`
 * below only returns the element's static *initial* style now; the actual
 * reveal happens by mutating the DOM node directly, the same way the assembly
 * hooks already animate text spans outside React's render cycle. Quantization
 * (24 steps) + the CSS transition still do the visual smoothing between samples.
 */
export function ScrollRevealProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const seenRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (reducedMotion) return;
    const seen = seenRef.current;

    const update = () => {
      const vh = window.innerHeight;
      const sy = window.scrollY;
      const els = document.querySelectorAll<HTMLElement>('[data-reveal-id]');
      els.forEach((el) => {
        const id = el.getAttribute('data-reveal-id');
        if (!id || id.indexOf('hero') === 0) return;
        const top = el.getBoundingClientRect().top + sy;
        const raw = Math.max(0, Math.min(1, (sy + vh * 0.88 - top) / (vh * 0.32)));
        const t = Math.round(raw * 24) / 24;
        if (seen.get(id) === t) return;
        seen.set(id, t);
        el.style.opacity = Math.min(1, t * 3.2).toFixed(3);
      });
    };

    update();
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        update();
        rafId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  return <>{children}</>;
}

/** Static initial style for a `data-reveal-id={id}` element — ScrollRevealProvider drives the actual reveal progress by writing to the DOM node directly, not through re-renders. */
export function useScrollReveal(id: string): CSSProperties {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return { opacity: 1, transform: 'none' };
  const initial = id.indexOf('hero') === 0 ? 1 : 0;
  return { opacity: initial, transform: 'none', transition: 'opacity 0.2s linear' };
}
