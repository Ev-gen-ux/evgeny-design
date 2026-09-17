import type { RefObject } from 'react';
import styles from './StageBadge.module.css';

export interface StageBadgeProps {
  dotRef: RefObject<HTMLSpanElement | null>;
  textRef: RefObject<HTMLDivElement | null>;
  initialColor: string;
  initialText: string;
}

/**
 * Fixed bottom-right "STAGE 0X/0Y · Z%" readout — extracted from PageBackdrop
 * (2026-08-02) so the case-study pages can reuse the exact same visual with
 * their own progress driver (useCaseStageProgress, counting that case's own
 * content sections) instead of the home page's 5-stage sweep. Purely a ref
 * target: whoever renders this owns the hook that writes into `dotRef`/
 * `textRef` directly — no props re-render this on every scroll frame.
 */
export function StageBadge({ dotRef, textRef, initialColor, initialText }: StageBadgeProps) {
  return (
    <div className={styles.stageBadge}>
      <span ref={dotRef} className={styles.stageBadgeDot} style={{ background: initialColor }} />
      <div ref={textRef}>{initialText}</div>
    </div>
  );
}
