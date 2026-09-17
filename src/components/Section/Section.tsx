import type { CSSProperties, MouseEventHandler, ReactNode, Ref } from 'react';
import { space } from '../../tokens';
import styles from './Section.module.css';

export interface SectionProps {
  id?: string;
  /** Vertical padding, in the fixed space scale (e.g. 60, 100) — matches the current site's per-section rhythm, not a single reused value. */
  paddingTop?: keyof typeof space;
  paddingBottom?: keyof typeof space;
  /** Wired up by the scroll-reveal hook in a later step; kept as pass-through data attributes so Section doesn't need to change shape then. */
  stageAnchor?: number;
  revealId?: string;
  /** Marks this section as one assembly-sync block — all its text converges to fully-assembled together, timed to this section's own center-crossing, instead of each element's individual position. See useAssemblyAnimation's `syncEl`. */
  asmSync?: boolean;
  className?: string;
  style?: CSSProperties;
  innerRef?: Ref<HTMLElement>;
  onMouseMove?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  children: ReactNode;
}

export function Section({
  id,
  paddingTop,
  paddingBottom,
  stageAnchor,
  revealId,
  asmSync,
  className,
  style,
  innerRef,
  onMouseMove,
  onMouseLeave,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      ref={innerRef}
      data-stage-anchor={stageAnchor}
      data-reveal-id={revealId}
      data-asm-sync={asmSync ? '1' : undefined}
      className={[styles.section, className].filter(Boolean).join(' ')}
      style={{
        paddingTop: paddingTop !== undefined ? space[paddingTop] : undefined,
        paddingBottom: paddingBottom !== undefined ? space[paddingBottom] : undefined,
        ...style,
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </section>
  );
}
