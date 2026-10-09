import { useEffect, useRef } from 'react';
import { useLenis } from 'lenis/react';
import { useMenuAssembly } from '../../hooks/useMenuAssembly';
import styles from './MobileNavOverlay.module.css';

export interface MobileNavOverlayLink {
  label: string;
  href: string;
}

export interface MobileNavOverlayProps {
  /** Header's own wordmark name (e.g. "Евгений Яковенко") — shown top-left here too, same as the collapsed header, so identity/branding doesn't disappear while the menu covers the rest of it. */
  name: string;
  links: readonly MobileNavOverlayLink[];
  /** Home-page anchors (`#work`) vs. cross-route links (`/work`) — same rule Header already applies to its own inline nav. */
  onHome: boolean;
  reducedMotion: boolean;
  /** Controls the slide transition — component stays mounted either way (2026-09-17 follow-up, see docstring). */
  open: boolean;
  onClose: () => void;
}

/**
 * Fullscreen mobile nav (2026-09-17, responsive pass follow-up) — replaces
 * Header's inline `.links` row on phone (see Header.module.css's ≤640px
 * `display:none`).
 *
 * Always mounted (2026-09-17 follow-up) rather than conditionally rendered
 * — a slide-in/out transition needs the panel present in the DOM on the way
 * OUT too, not just the way in; `open` drives a CSS transform (see
 * `.overlay[data-open]`) instead of React mount/unmount. `useMenuAssembly`
 * re-splits/re-scatters the link labels every time `open` flips true
 * (see that hook's own docstring for why re-running on every open, not
 * just once, is the right call here).
 *
 * No close button of its own (2026-09-17 follow-up — there used to be one
 * in `.topRow`, removed per explicit user request): a button living inside
 * this panel would slide out WITH it on close, which read as "the close
 * button flies away" instead of a clean morph. Header's own `.menuTrigger`
 * (fixed in place, outside this sliding panel, raised above it via
 * `z-index`) is the only control — it morphs its own label between
 * `[ menu ]`/`[ close ]` in place via `useLabelMorph` and toggles `open`.
 * Escape and clicking a link still close via `onClose`.
 */
export function MobileNavOverlay({ name, links, onHome, reducedMotion, open, onClose }: MobileNavOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  useMenuAssembly(containerRef, reducedMotion, open);
  const lenis = useLenis();

  useEffect(() => {
    if (!open) return;
    // Scroll lock is `lenis?.stop()` alone (2026-09-18, same-day revision —
    // see App.tsx's docstring for the full story of why `autoToggle` stays
    // at its default true). Lenis's own `.stop()` sets `overflow: clip` on
    // `document.documentElement`, which blocks scrolling robustly regardless
    // of input method (wheel, touch, keyboard, scrollbar drag) — a second,
    // independent `document.body.style.overflow = 'hidden'` here used to
    // duplicate that block on a different element, which was *harmless* for
    // actually stopping scroll but was the root of the menu trigger's edge
    // padding coming out wrong: two separately-toggled overflow sources
    // fighting over the same scrollbar-width layout shift. Not setting our
    // own overflow at all removes that conflict outright.
    //
    // The compensating `padding-right` still has to happen here, though —
    // Lenis's own toggle still removes the scrollbar and still shifts
    // available page width by that amount, same as any overflow:hidden
    // would. Measured and applied *before* `lenis.stop()` runs, so the
    // scrollbar is still present when we measure it. On a real mobile
    // device (overlay scrollbars, no reserved width) this measures 0 and is
    // a complete no-op either way.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevPaddingRight = document.body.style.paddingRight;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    lenis?.stop();
    // `preventScroll` (2026-10-09) — without it, focusing a link that's
    // still mid-`translateX` (the panel's own open transition hasn't
    // finished yet) could make the browser auto-scroll the page to bring
    // the not-yet-fully-on-screen element into view, which reads as the
    // whole page lurching sideways right as the menu opens.
    firstLinkRef.current?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.paddingRight = prevPaddingRight;
      lenis?.start();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, lenis]);

  return (
    <div
      className={styles.overlay}
      data-open={open ? '1' : '0'}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label="Навигация"
    >
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.topRow}>
        <span className={styles.name}>{name}</span>
      </div>
      <div ref={containerRef} className={styles.links}>
        {links.map((l, i) => (
          <a
            key={l.href}
            ref={i === 0 ? firstLinkRef : undefined}
            href={onHome ? l.href : `/${l.href}`}
            className={styles.link}
            onClick={onClose}
          >
            <span data-menu-asm="1">{l.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
