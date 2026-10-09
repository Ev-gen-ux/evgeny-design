import { useRef, useState } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { Link, MobileNavOverlay } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSessionDotPulse } from '../../hooks/useSessionDotPulse';
import { useLabelMorph } from '../../hooks/useLabelMorph';
import { useStableViewportWidth } from '../../hooks/useStableViewportWidth';
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
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();
  const sessionDotRef = useRef<HTMLSpanElement>(null);
  useSessionDotPulse(sessionDotRef, !reducedMotion);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  useLabelMorph(menuTriggerRef, menuOpen ? '[ close ]' : '[ menu ]', reducedMotion);
  // JS-measured width, not CSS `right: 0` (2026-09-18) — see
  // useStableViewportWidth's own docstring for the full "menu trigger's
  // edge padding jumps while scrolling" investigation this replaces.
  const navWidth = useStableViewportWidth();

  const tagContent = (
    <span className={styles.tag}>
      <span ref={sessionDotRef} className={styles.sessionDot} aria-hidden="true" />
      {wordmark.tag}
    </span>
  );

  return (
    <nav className={styles.nav} style={navWidth !== undefined ? { width: navWidth } : undefined}>
      <div className={styles.scrim} aria-hidden="true" />
      {onHome ? (
        <a
          href="#hero"
          className={styles.wordmark}
          onClick={(e) => {
            // Already on Home, so this is a same-document fragment click — React
            // Router's `useLocation().hash` never updates for it (no pushState/
            // popstate gets dispatched), so Home's `useHomeEntryScroll` effect never
            // re-runs and the browser's own native anchor-jump is left to fight
            // Lenis alone — on mobile, after a long touch-scroll, that native jump
            // regularly lost and settled on "О себе" instead of the hero. Scrolling
            // here directly, the same Lenis-aware way useHomeEntryScroll does, fixes
            // it regardless of router state.
            const el = document.getElementById('hero');
            if (!el) return;
            e.preventDefault();
            if (lenis) lenis.scrollTo(el.getBoundingClientRect().top + window.scrollY, { immediate: true });
            else el.scrollIntoView();
          }}
        >
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
      {/* Back inside `<nav>` (2026-09-19) — moved out earlier the same day
          for a `transform`-based header-position fix attempt that was
          later abandoned in favor of `position: sticky` (which doesn't
          create a containing block for fixed descendants the way
          `transform` did, so that specific coupling risk is gone). Being
          a sibling of `<nav>` instead of its child turned out to have its
          own real cost: `.nav` has `isolation: isolate`, which scopes
          `.menuTrigger`'s `z-index: 201` (deliberately above the overlay's
          200, see that rule's own comment — it's the ONLY open/close
          control) to comparisons *within* `.nav`'s own stacking context.
          Once the overlay became `.nav`'s sibling instead of its child,
          the trigger's z-index no longer won against it at all — the
          overlay's near-opaque background rendered over the entire
          header, trigger included, leaving no visible way to close the
          menu. Moving it back restores the original, correct stacking
          relationship. */}
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
