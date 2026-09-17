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
    // `document.body.style.overflow` alone doesn't actually stop scroll on
    // this site — Lenis (see App.tsx) intercepts wheel/touch input and
    // drives `window.scrollY` itself, independent of native overflow.
    // Without `lenis.stop()`, the page behind this fixed overlay could
    // still scroll under touch input even though it looked locked.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lenis?.stop();
    firstLinkRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
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
      {/* Bottom bar, same visual language as the page's own ChatBar (arrow +
          "you:" prompt on the left, status dot + label on the right) — fills
          what was empty space below the links and keeps the "you/agent"
          chat framing consistent even inside the menu overlay. */}
      <div className={styles.bottomBar}>
        <span className={styles.arrow}>›</span>
        <span className={styles.bottomText}>you: куда дальше?</span>
        <span className={styles.bottomStatus}>
          <span className={styles.bottomDot} aria-hidden="true" />
          {links.length} routes
        </span>
      </div>
    </div>
  );
}
