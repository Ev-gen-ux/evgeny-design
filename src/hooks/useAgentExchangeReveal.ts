import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Scroll-triggered 0→1 progress for a single AgentExchange block — same
 * shape as useMatrixReveal (scroll handler, not a continuous rAF loop, since
 * this only needs to grow once as the block enters view), just without the
 * row/stagger part since there's only one bar here. Drives the "agent" row's
 * response-bar width; reduced motion renders at full width immediately.
 */
export function useAgentExchangeReveal(ref: RefObject<HTMLElement | null>, reducedMotion: boolean): number {
  const [t, setT] = useState(reducedMotion ? 1 : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) return;

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const raw = (window.innerHeight * 0.86 - r.top) / (r.height * 0.5 + 40);
        const clamped = Math.max(0, Math.min(1, raw));
        const q = Math.round(clamped * 50) / 50;
        setT((prev) => (prev === q ? prev : q));
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    const initial = requestAnimationFrame(onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(initial);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ref, reducedMotion]);

  return reducedMotion ? 1 : t;
}
