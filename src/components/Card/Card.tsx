import type { CSSProperties, ElementType, MouseEventHandler, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps {
  as?: ElementType;
  href?: string;
  /** Renders the 4 corner-bracket decorations (the "design-tool selection box" look). Default true. */
  corners?: boolean;
  className?: string;
  style?: CSSProperties;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseMove?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  /** Rendered as a sibling *before* the content wrapper (z-index 0, content is z-index 1) — matches source's blobStyle div sitting behind the real content, not inside it. */
  behindContent?: ReactNode;
  children: ReactNode;
}

/**
 * Static "spec sheet" card shell — glass surface, border/shadow/corner hover shift
 * all in CSS. The mouse-tilt + cursor-following glow blob (Selected Work cards
 * only) are layered on top via useCardTilt at the call site — this primitive
 * just exposes onMouseMove so that hook can attach.
 */
export function Card({
  as,
  href,
  corners = true,
  className,
  style,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  behindContent,
  children,
}: CardProps) {
  const Tag = as ?? (href ? 'a' : 'div');
  return (
    <Tag
      href={href}
      className={[styles.card, className].filter(Boolean).join(' ')}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {corners && (
        <>
          <span className={[styles.corner, styles.cornerTopLeft].join(' ')} aria-hidden="true" />
          <span className={[styles.corner, styles.cornerTopRight].join(' ')} aria-hidden="true" />
          <span className={[styles.corner, styles.cornerBottomLeft].join(' ')} aria-hidden="true" />
          <span className={[styles.corner, styles.cornerBottomRight].join(' ')} aria-hidden="true" />
        </>
      )}
      {behindContent}
      <div className={styles.content}>{children}</div>
    </Tag>
  );
}
