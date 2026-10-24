import { useEffect, useRef } from 'react';
import { useMenuAssembly } from '../../hooks/useMenuAssembly';
import styles from './MobileNavOverlay.module.css';

export interface MobileNavOverlayLink {
  label: string;
  href: string;
}

export interface MobileNavOverlayProps {
  links: readonly MobileNavOverlayLink[];
  /** Home-page anchors (`#work`) vs. cross-route links (`/work`) — same rule Header already applies to its own inline nav. */
  onHome: boolean;
  reducedMotion: boolean;
  /** Controls the expand transition — component stays mounted either way (2026-09-17 follow-up, see docstring). */
  open: boolean;
  onClose: () => void;
  /** Referenced by Header's `.menuTrigger` via `aria-controls`. */
  panelId: string;
}

/**
 * Mobile link disclosure panel (2026-10-24, 6th redesign pass same day —
 * see MobileNavOverlay.module.css's and Header.module.css's `.surface`
 * docstrings for the full story). Earlier passes: a fullscreen
 * `position:fixed` overlay with its own background that REPLACED Header's
 * `.nav` card while open; an in-flow flex row inside `.nav` (grew `.nav`'s
 * own box height, pushing sticky-positioned page content on open); a
 * `position:absolute` panel with its OWN glass background flush-aligned
 * against `.nav`'s — this last one still read as two containers, because
 * two independent `backdrop-filter` passes produce a visibly non-uniform
 * glass texture at the seam no matter how precisely the borders align
 * (confirmed live, screenshot 224).
 *
 * Now: this component owns ONLY the content (links) and the height
 * transition — no background/border/blur of its own. The actual glass
 * card is `Header.module.css`'s `.surface`, a sibling inside `.nav` that
 * grows down by this panel's measured height in lockstep with this
 * element's own `max-height` reveal, so there's exactly one
 * `backdrop-filter` pass for the whole card, whatever its height.
 * `.wordmark` (name + session tag + dot) stays on screen unchanged the
 * whole time; the ONLY thing that changes on open is Header's own trigger
 * label (`[ menu ]` → `[ close ]`, via `useLabelMorph`, untouched by this
 * component).
 *
 * Always mounted — a height transition needs the panel present in the DOM
 * on the way OUT too, not just the way in; `open` drives a CSS `max-height`
 * transition against a JS-measured `--panel-h` custom property, written to
 * `:root` so `.surface` (a sibling, not a descendant) can read it too —
 * grid's `0fr`→`1fr` trick doesn't reliably collapse to true 0 here, since
 * this container's own height is itself auto/intrinsic, which is exactly
 * the case where browsers fall back to the row's max-content size instead
 * of 0. `useMenuAssembly` re-splits/re-scatters the link labels every time
 * `open` flips true (see that hook's own docstring).
 */
export function MobileNavOverlay({ links, onHome, reducedMotion, open, onClose, panelId }: MobileNavOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  useMenuAssembly(containerRef, reducedMotion, open);

  // Keeps `--panel-h` current with the links column's real content height,
  // continuously (not just on open) — so the very first open already has
  // an accurate value instead of a guessed fallback, and a viewport
  // resize/rotation while open re-measures live. Written to `:root`, not
  // this panel's own element (2026-10-24, 6th pass) — Header.module.css's
  // `.surface` is a SIBLING of this component inside `.nav`, not a
  // descendant, so it needs the variable on a shared ancestor to read it;
  // `:root` is the simplest one, safe since only one Header/menu exists
  // per page at a time.
  useEffect(() => {
    const linksEl = containerRef.current;
    if (!linksEl) return;
    const update = () => {
      document.documentElement.style.setProperty('--panel-h', `${linksEl.scrollHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(linksEl);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    // No scroll lock (2026-10-24, explicit user request) — the page behind
    // the panel stays scrollable while it's open; the menu only opens/
    // closes via the trigger button (never by an outside click or scroll
    // gesture), so there's no risk of losing the open panel to a stray
    // scroll. An earlier version locked scroll via `lenis?.stop()` plus a
    // scrollbar-width `padding-right` compensation on `<body>` — removed
    // outright, not just the lock: that compensation was *only* non-zero
    // on pages with their own vertical scrollbar (Home, not the single-
    // viewport case-study pages), so it visibly nudged just Home's content
    // left by a few px on every open (reported live, screenshot 225/226 —
    // `<body style="padding-right: 4px">` only on Home).
    //
    // `preventScroll` (2026-10-09) — without it, focusing a link while the
    // panel's own expand transition hasn't finished yet could make the
    // browser auto-scroll the page to bring the not-yet-fully-visible
    // element into view, which reads as the page lurching right as the menu
    // opens.
    firstLinkRef.current?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div id={panelId} className={styles.overlay} data-open={open ? '1' : '0'} aria-hidden={!open}>
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
