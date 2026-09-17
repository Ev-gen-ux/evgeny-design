import type { CursorTracker } from '../../hooks/useCursorTracker';
import styles from './CursorOverlay.module.css';

export interface CursorOverlayProps {
  cursor: CursorTracker;
}

/** Renders the crosshair ring + dot + live coordinate readout — hidden entirely unless cursor.show. */
export function CursorOverlay({ cursor }: CursorOverlayProps) {
  if (!cursor.show) return null;

  const coordText = `x:${String(cursor.mx).padStart(4, '0')}  y:${String(cursor.my).padStart(4, '0')}`;

  return (
    <>
      <div
        className={[styles.ring, cursor.hover && styles.ringHover].filter(Boolean).join(' ')}
        style={{
          left: cursor.mx,
          top: cursor.my,
          transform: `translate(-50%,-50%) scale(${cursor.hover ? 1.8 : 1})`,
        }}
        aria-hidden="true"
      />
      <div className={styles.dot} style={{ left: cursor.mx, top: cursor.my, transform: 'translate(-50%,-50%)' }} aria-hidden="true" />
      <div
        className={[styles.coord, cursor.hover && styles.coordHover].filter(Boolean).join(' ')}
        style={{ left: cursor.mx + 22, top: cursor.my + 14 }}
        aria-hidden="true"
      >
        {coordText}
      </div>
    </>
  );
}
