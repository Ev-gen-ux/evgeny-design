import { HeaderLogo } from './HeaderLogo';
import { DesktopInlineMenu } from './DesktopInlineMenu';
import { useMenuInputMode } from '../../hooks/useMenuInputMode';
import { breakpoints, runtimeTokens } from '../../tokens';
import { useRef, useState } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { MobileNavOverlay } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSessionDotPulse } from '../../hooks/useSessionDotPulse';
import { useLabelMorph } from '../../hooks/useLabelMorph';
import { useStableViewportWidth } from '../../hooks/useStableViewportWidth';
import { navLinks } from '../../content/nav';
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
  useMenuInputMode();
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();
  const sessionDotRef = useRef<HTMLSpanElement>(null);
  useSessionDotPulse(sessionDotRef, !reducedMotion);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  useLabelMorph(menuTriggerRef, menuOpen ? '[ close ]' : '[ menu ]', reducedMotion);
  // JS-measured width, not a CSS `right: <margin>` (2026-09-18, extended
  // 2026-10-24 for the floating-container redesign) — see
  // useStableViewportWidth's own docstring for the full "menu trigger's
  // edge padding jumps while scrolling" investigation this replaces. Margin
  // must match Header.module.css's own `--space-40`/`--space-20` values at
  // the same 640px breakpoint used there.
  const viewportWidth = useStableViewportWidth();
  const navMargin = viewportWidth !== undefined && viewportWidth <= breakpoints.phone ? runtimeTokens.floatingPanel.sidePhone : runtimeTokens.floatingPanel.sideDesktop;
  const navStyle =
    viewportWidth !== undefined ? { left: navMargin, width: viewportWidth - navMargin * 2 } : undefined;
  const menuPanelId = 'mobile-nav-panel';

  const tagContent = (
    <span className={styles.tag}>
      <span ref={sessionDotRef} className={styles.sessionDot} data-header-status-dot="1" aria-hidden="true" />
      agent-built
    </span>
  );

  return (
    <nav className={styles.nav} style={navStyle} data-menu-open={menuOpen ? '1' : undefined}>
      <div className={styles.surface} aria-hidden="true" />
      {/* One brand row: status, centered logo and responsive menu. */}
      <div className={styles.topRow} data-header-brand-row="1">
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

            {tagContent}
          </a>
        ) : (
          <RouterLink to="/#hero" className={styles.wordmark}>

            {tagContent}
          </RouterLink>
        )}
        <HeaderLogo onHome={onHome} />
        <DesktopInlineMenu cursor={cursor} />
        <button
          ref={menuTriggerRef}
          type="button"
          className={styles.menuTrigger}
          onClick={() => setMenuOpen((v) => !v)}
          aria-controls={menuPanelId}
          aria-expanded={menuOpen}
        />
      </div>
      {/* Link panel — still inside `<nav>`, not a sibling (2026-09-19 fix,
          see git history) — `.nav`'s `isolation: isolate` scopes
          `.menuTrigger`'s `z-index: 201` to comparisons *within* `.nav`'s
          own stacking context. It's `position: absolute` against `.nav`
          (`.nav` is its containing block) and renders only its own
          content now — the card's actual glass surface is `.surface`
          above, a sibling this panel grows in sync with via `--panel-h`
          (2026-10-24, 6th pass — see MobileNavOverlay.tsx's own
          docstring for why two separate glass layers didn't work). */}
      <MobileNavOverlay
        links={navLinks}
        onHome={onHome}
        reducedMotion={reducedMotion}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        panelId={menuPanelId}
        triggerRef={menuTriggerRef}
      />
    </nav>
  );
}
