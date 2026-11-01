import type { CSSProperties, ReactNode } from 'react';
import { resolveSpacing, type SpacingValue } from '../../tokens';
import styles from './Grid.module.css';

export interface GridProps {
  /** Raw grid-template-columns — the site uses several bespoke column patterns
   * (e.g. `repeat(auto-fit,minmax(260px,1fr))`, `minmax(90px,120px) 1fr`) rather
   * than one reusable set, so this stays an escape hatch instead of a fixed enum. */
  columns?: string;
  gap?: SpacingValue;
  rowGap?: SpacingValue;
  columnGap?: SpacingValue;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Grid({ columns, gap, rowGap, columnGap, className, style, children }: GridProps) {
  return (
    <div
      className={[styles.grid, className].filter(Boolean).join(' ')}
      style={{
        gridTemplateColumns: columns,
        gap: gap !== undefined ? resolveSpacing(gap) : undefined,
        rowGap: rowGap !== undefined ? resolveSpacing(rowGap) : undefined,
        columnGap: columnGap !== undefined ? resolveSpacing(columnGap) : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
