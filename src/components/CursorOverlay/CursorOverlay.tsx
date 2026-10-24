import type { CursorTracker } from '../../hooks/useCursorTracker';
import styles from './CursorOverlay.module.css';

export interface CursorOverlayProps {
  cursor: CursorTracker;
}

/**
 * Renders the crosshair ring + dot + live coordinate readout — hidden entirely
 * unless cursor.show. Position comes from the hook writing straight to these
 * refs' `style.transform` every frame, not from props/state — see
 * useCursorTracker's 2026-10-24 comment.
 */
export function CursorOverlay({ cursor }: CursorOverlayProps) {
  if (!cursor.show) return null;

  return (
    <>
      <div
        ref={cursor.ringRef}
        className={[styles.ring, cursor.hover && styles.ringHover].filter(Boolean).join(' ')}
        aria-hidden="true"
      />
      <div ref={cursor.dotRef} className={styles.dot} aria-hidden="true" />
      <div
        ref={cursor.coordRef}
        className={[styles.coord, cursor.hover && styles.coordHover].filter(Boolean).join(' ')}
        aria-hidden="true"
      />
    </>
  );
}
