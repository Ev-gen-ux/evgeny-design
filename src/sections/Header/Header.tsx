import { useRef, useState } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Link, MobileNavOverlay } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSessionDotPulse } from '../../hooks/useSessionDotPulse';
import { useLabelMorph } from '../../hooks/useLabelMorph';
import { navLinks, wordmark } from '../../content/nav';
import styles from './Header.module.css';

export interface HeaderProps {
  /**
   * The case-study page renders this same Header ("это один компонент" — one
   * shared component, per user request) but has no cursor-tracking system of
   * its own (the source's Case Study.dc.html imports Site Header without the
   * on-enter/on-leave props Portfolio.dc.html passes) — pass a no-op tracker there.
   */
  cursor: CursorTracker;
}

/**
 * Nav links are section anchors on the home page (#work, #hero, …). On any
 * other route (the case-study page), a bare "#work" href would just tack a
 * hash onto the current /work/:id URL instead of navigating home — so those
 * links get prefixed with "/" there instead, routing through React Router
 * back to Home, which then scrolls to the hash on mount (see Home.tsx).
 */
export function Header({ cursor }: HeaderProps) {
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const reducedMotion = useReducedMotion();
  const sessionDotRef = useRef<HTMLSpanElement>(null);
  useSessionDotPulse(sessionDotRef, !reducedMotion);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  useLabelMorph(menuTriggerRef, menuOpen ? '[ close ]' : '[ menu ]', reducedMotion);

  const tagContent = (
    <span className={styles.tag}>
      <span ref={sessionDotRef} className={styles.sessionDot} aria-hidden="true" />
      {wordmark.tag}
    </span>
  );

  return (
    <nav className={styles.nav}>
      <div className={styles.scrim} aria-hidden="true" />
      {onHome ? (
        <a href="#hero" className={styles.wordmark}>
          <span className={styles.name}>{wordmark.name}</span>
          {tagContent}
        </a>
      ) : (
        <RouterLink to="/#hero" className={styles.wordmark}>
          <span className={styles.name}>{wordmark.name}</span>
          {tagContent}
        </RouterLink>
      )}
      <div className={styles.links}>
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={onHome ? l.href : `/${l.href}`}
            variant="nav"
            onMouseEnter={cursor.onEnter}
            onMouseLeave={cursor.onLeave}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <button
        ref={menuTriggerRef}
        type="button"
        className={styles.menuTrigger}
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
      />
      <MobileNavOverlay
        name={wordmark.name}
        links={navLinks}
        onHome={onHome}
        reducedMotion={reducedMotion}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </nav>
  );
}
