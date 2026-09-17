import { useCallback, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

export interface SpotGlow {
  x: number;
  y: number;
  active: boolean;
}

/**
 * 1:1 with onHeroMove/onHeroLeave — the Redline radial-gradient glow that
 * follows the cursor within a container (separate from the page-wide
 * crosshair in useCursorTracker). Originally hero-only (`useHeroSpot`);
 * renamed and reused (2026-08-02) for the case-study pages' own background
 * grid, per user request — same glow-follows-cursor mechanic, just applied
 * to a different container.
 */
export function useSpotGlow() {
  const [spot, setSpot] = useState<SpotGlow>({ x: -100, y: -100, active: false });
  const rafRef = useRef<number | null>(null);

  const onMove = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    if (rafRef.current) return;
    const ex = e.clientX;
    const ey = e.clientY;
    const target = e.currentTarget;
    rafRef.current = requestAnimationFrame(() => {
      const r = target.getBoundingClientRect();
      setSpot({ x: ex - r.left, y: ey - r.top, active: true });
      rafRef.current = null;
    });
  }, []);

  const onLeave = useCallback(() => setSpot((s) => ({ ...s, active: false })), []);

  return { spot, onMove, onLeave };
}
