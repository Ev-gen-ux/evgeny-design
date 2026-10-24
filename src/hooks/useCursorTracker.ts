import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { useIsTouchDevice } from './useIsTouchDevice';

export interface CursorTracker {
  /** Whether the custom crosshair should render at all (hidden on touch/reduced-motion). */
  show: boolean;
  hover: boolean;
  onEnter: () => void;
  onLeave: () => void;
  /** Written to directly on every mousemove frame — see CursorOverlay. */
  ringRef: RefObject<HTMLDivElement | null>;
  dotRef: RefObject<HTMLDivElement | null>;
  coordRef: RefObject<HTMLDivElement | null>;
}

/**
 * Page-wide custom cursor — 1:1 with componentDidMount's cursor logic: hides the
 * native cursor (`body.style.cursor = 'none'`) and tracks mouse position via a
 * throttled rAF loop, rendered as a fixed ring+dot+coordinate readout (see
 * CursorOverlay). `hover` is toggled by nav links, hero CTAs, and case-study/
 * project cards to grow the ring and tint it Redline — wire onEnter/onLeave onto
 * those elements' onMouseEnter/onMouseLeave.
 *
 * Position is written straight to the DOM via refs inside the rAF callback
 * (2026-10-24, review-animations audit) instead of through `useState` — the
 * previous version called `setPos()` every frame, forcing a React re-render of
 * CursorOverlay on every mouse movement, and positioned via `left`/`top` (a
 * layout-tier property) rather than `transform` (composite-only). Neither
 * shows up on a fast dev machine; both are exactly the traps
 * animation-performance's "React: Don't Animate Through State" and "What You
 * Animate" sections warn about. `hover` stays in React state — it only
 * flips on enter/leave, not every frame, so a re-render there is free.
 */
export function useCursorTracker(): CursorTracker {
  const reducedMotion = useReducedMotion();
  const isTouch = useIsTouchDevice();
  const show = !isTouch && !reducedMotion;

  const [hover, setHover] = useState(false);
  const hoverRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const coordRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.cursor = show ? 'none' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const onMove = (e: MouseEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const { clientX: x, clientY: y } = e;
        const scale = hoverRef.current ? 1.8 : 1;
        if (ringRef.current) {
          ringRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
        }
        if (dotRef.current) {
          dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        }
        if (coordRef.current) {
          coordRef.current.style.transform = `translate3d(${x + 22}px, ${y + 14}px, 0)`;
          coordRef.current.textContent = `x:${String(x).padStart(4, '0')}  y:${String(y).padStart(4, '0')}`;
        }
        rafRef.current = null;
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [show]);

  const onEnter = useCallback(() => {
    hoverRef.current = true;
    setHover(true);
  }, []);
  const onLeave = useCallback(() => {
    hoverRef.current = false;
    setHover(false);
  }, []);

  return { show, hover, onEnter, onLeave, ringRef, dotRef, coordRef };
}
