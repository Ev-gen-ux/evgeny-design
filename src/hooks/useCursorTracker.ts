import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { useIsTouchDevice } from './useIsTouchDevice';

export interface CursorTracker {
  /** Whether the custom crosshair should render at all (hidden on touch/reduced-motion). */
  show: boolean;
  mx: number;
  my: number;
  hover: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

/**
 * Page-wide custom cursor — 1:1 with componentDidMount's cursor logic: hides the
 * native cursor (`body.style.cursor = 'none'`) and tracks mouse position via a
 * throttled rAF loop, rendered as a fixed ring+dot+coordinate readout (see
 * CursorOverlay). `hover` is toggled by nav links, hero CTAs, and case-study/
 * project cards to grow the ring and tint it Redline — wire onEnter/onLeave onto
 * those elements' onMouseEnter/onMouseLeave.
 */
export function useCursorTracker(): CursorTracker {
  const reducedMotion = useReducedMotion();
  const isTouch = useIsTouchDevice();
  const show = !isTouch && !reducedMotion;

  const [pos, setPos] = useState({ mx: -200, my: -200 });
  const [hover, setHover] = useState(false);
  const rafRef = useRef<number | null>(null);

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
        setPos({ mx: e.clientX, my: e.clientY });
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

  const onEnter = useCallback(() => setHover(true), []);
  const onLeave = useCallback(() => setHover(false), []);

  return { show, mx: pos.mx, my: pos.my, hover, onEnter, onLeave };
}
