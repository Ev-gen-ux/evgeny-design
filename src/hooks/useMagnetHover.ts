import { useCallback, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

export interface MagnetState {
  x: number;
  y: number;
  hover: boolean;
}

/**
 * 1:1 with magnetHandlers() + the transform half of linkStyle() in
 * Portfolio.dc.html — hero CTAs and the contact email/links nudge toward the
 * cursor within their own bounding box, like a soft magnet. Deferred back at
 * step 04/06 (noted in Link's docstring as "layered on later"), now built.
 */
export function useMagnetHover(reducedMotion: boolean) {
  const [state, setState] = useState<MagnetState>({ x: 0, y: 0, hover: false });

  const onMouseEnter = useCallback(() => setState((s) => ({ ...s, hover: true })), []);

  const onMouseMove = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.28;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.35;
    setState({ x, y, hover: true });
  }, []);

  const onMouseLeave = useCallback(() => setState({ x: 0, y: 0, hover: false }), []);

  return {
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
    transform: reducedMotion ? 'none' : `translate(${state.x}px,${state.y}px)`,
    hover: state.hover,
  };
}
