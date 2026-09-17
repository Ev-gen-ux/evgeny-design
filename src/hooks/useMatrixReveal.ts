import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Started as a 1:1 port of the `matrixT` scroll handler in Case Study.dc.html's
 * componentDidMount() — as the feature-coverage box scrolls into view, bar
 * width (and its "N%" readout) grows via a CSS width transition (not a
 * per-frame JS animation loop like the other assembly/scroll effects).
 *
 * Deliberate deviation from source (user request, 2026-08-02): the source
 * drove every row off the SAME progress value, so all bars filled
 * simultaneously (to different final widths) — read as "everything loads at
 * once" and the user wanted a top-to-bottom sequential reveal instead. Reuses
 * the same per-item stagger formula already used for letter/word reveal in
 * useAssemblyAnimation/useCaseStudyAssembly, applied to rows instead of
 * spans: every row shares the same scroll-driven raw progress, offset by its
 * index and rescaled so the last row still reaches 1 exactly when raw does.
 *
 * Reduced motion: every row is 1 from the start, no scroll listener — bars
 * render at final width immediately.
 */
export function useMatrixReveal(matrixRef: RefObject<HTMLElement | null>, reducedMotion: boolean, rowCount: number): number[] {
  const [rows, setRows] = useState<number[]>(() => Array.from({ length: rowCount }, () => (reducedMotion ? 1 : 0)));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) return;

    const stagger = rowCount > 1 ? Math.min(0.6 / (rowCount - 1), 0.14) : 0;
    const span = 1 - stagger * (rowCount - 1);

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = matrixRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const raw = (window.innerHeight * 0.86 - r.top) / (r.height * 0.5 + 1);
        const clamped = Math.max(0, Math.min(1, raw));
        const q = Math.round(clamped * 50) / 50;
        const next = Array.from({ length: rowCount }, (_, i) => {
          const local = Math.max(0, Math.min(1, (q - i * stagger) / span));
          return Math.round(local * 50) / 50;
        });
        setRows((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    const initial = requestAnimationFrame(onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(initial);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [matrixRef, reducedMotion, rowCount]);

  return reducedMotion ? Array.from({ length: rowCount }, () => 1) : rows;
}
