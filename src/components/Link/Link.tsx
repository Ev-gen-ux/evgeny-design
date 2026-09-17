import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import styles from './Link.module.css';

export type LinkVariant = 'nav' | 'underline' | 'accent' | 'plain' | 'ghost' | 'email' | 'contactNav';

export interface LinkProps
  extends Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'onMouseEnter' | 'onMouseMove' | 'onMouseLeave' | 'onClick' | 'aria-label'> {
  href: string;
  variant?: LinkVariant;
  /** Adds target="_blank" rel="noopener" — used for external project/case links. */
  external?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Styled link primitive covering the site's hover treatments. `nav` is plain CSS
 * hover as in the header; `contactNav` is the same hover behavior (color+border+lift)
 * layered onto the contact row's own resting color, per explicit user request —
 * a deliberate deviation from source's contactBase (which never grows a border).
 * `underline`/`accent`/`plain`/`email` are the static base for links the source also
 * drives with a small cursor-magnet displacement (see useMagnetHover) — that's wired
 * in by the caller via onMouseMove + a `style.transform`, not built into this primitive.
 *
 * Internal routes (href starting with "/", not external) render via React Router's
 * <Link> for client-side SPA navigation — the source is a real multi-page site
 * (separate .dc.html documents) with the browser's native Cross-Document View
 * Transitions handling the animated hop; the plan (section 4) deliberately swaps
 * that for React Router instead, so this isn't a 1:1 port, it's the approved
 * architecture change.
 */
export function Link({ href, variant = 'underline', external, className, style, children, ...handlers }: LinkProps) {
  const classNames = [styles.link, styles[variant], className].filter(Boolean).join(' ');
  const isInternal = !external && href.startsWith('/');

  if (isInternal) {
    return (
      <RouterLink to={href} className={classNames} style={style} {...handlers}>
        {children}
      </RouterLink>
    );
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener' : undefined}
      className={classNames}
      style={style}
      {...handlers}
    >
      {children}
    </a>
  );
}
