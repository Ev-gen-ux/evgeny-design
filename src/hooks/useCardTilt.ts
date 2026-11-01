import { token, runtimeTokens } from '../tokens';
import { useCallback, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

export interface CardTiltState {
  hover: boolean;
  rx: number;
  ry: number;
  lx: number;
  ly: number;
}

/**
 * 1:1 with cardHandlers()/cardStyle()/blobStyle() in Portfolio.dc.html — the
 * corner-relative 3D tilt + cursor-following glow blob on Selected Work case
 * cards specifically (project cards use a plain translateY lift instead, no
 * rotation — already built, not this hook).
 */
export function useCardTilt(reducedMotion: boolean) {
  const [state, setState] = useState<CardTiltState>({ hover: false, rx: 0, ry: 0, lx: 0, ly: 0 });

  const onMouseEnter = useCallback(() => setState((s) => ({ ...s, hover: true })), []);

  const onMouseMove = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setState({ hover: true, rx: py * -runtimeTokens.cardTilt.range, ry: px * runtimeTokens.cardTilt.range, lx: e.clientX - r.left, ly: e.clientY - r.top });
  }, []);

  const onMouseLeave = useCallback(() => setState((s) => ({ ...s, hover: false, rx: 0, ry: 0 })), []);

  const transform = reducedMotion ? 'none' : `perspective(${runtimeTokens.cardTilt.perspective}px) rotateX(${state.rx}deg) rotateY(${state.ry}deg)`;
  const boxShadow = state.hover ? token('shadow-card-hover') : token('shadow-card-rest');
  const blobOpacity = state.hover && !reducedMotion ? 1 : 0;

  return { onMouseEnter, onMouseMove, onMouseLeave, transform, boxShadow, lx: state.lx, ly: state.ly, blobOpacity };
}
