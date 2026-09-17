import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLenis } from 'lenis/react';

const KEY = 'portfolio:scroll';

export function saveScrollForReturn() {
  try {
    sessionStorage.setItem(KEY, String(window.scrollY));
  } catch {
    /* storage blocked */
  }
}

/**
 * Coordinates Home's scroll position on mount/route-entry — one decision, not
 * two effects racing each other (a previous version had a separate "restore
 * saved scroll" effect and a separate "scroll to hash" effect, both able to
 * fire on the same mount; restoring the *wrong* one — e.g. still snapping back
 * to #work after clicking the header logo, which navigates to /#hero — was
 * exactly the bug this fixes).
 *
 * Priority:
 * 1. hash is "#work" AND a saved scroll position exists → this is genuinely
 *    the "back to cases" return trip (only the case card's/case page's
 *    "Открыть кейс"/"Вернуться к кейсам" links save that position and both
 *    target #work) — restore the exact pixel position, consume the key.
 * 2. Any other hash (e.g. "#hero" from the logo, "#experience" from a nav
 *    link) → scroll that section into view. A stale saved position from an
 *    earlier case visit is deliberately ignored here, not consumed.
 * 3. No hash at all → do nothing; natural top-of-page load.
 *
 * Goes through Lenis's own `scrollTo` (2026-08-02, once Lenis was added):
 * Lenis owns the real scroll position once it's mounted, tracking its own
 * `targetScroll`/`animatedScroll` independent of the DOM's actual scrollTop.
 * A raw `window.scrollTo()` moves the page but Lenis doesn't reliably learn
 * about it (its native-scroll resync only fires while `isScrolling` is
 * `false`/`"native"` — mid-inertia from the click that triggered this
 * navigation, it's often `"smooth"`) — Lenis's own next animation frame then
 * carries on toward its stale target, silently undoing the jump. Falls back
 * to the raw DOM APIs when there's no Lenis instance (prefers-reduced-motion,
 * where Lenis isn't mounted at all — see App.tsx).
 *
 * useLayoutEffect, not useEffect (2026-08-02, "jerky" page-transition fix):
 * useEffect runs after paint, so Home briefly flashed at whatever scroll
 * position (usually 0) it happened to mount at before snapping to the
 * restored position a frame later. useLayoutEffect applies the correction
 * before the browser ever paints the wrong position. lenis.resize() first
 * so its cached document-height/limit reflects Home's actual content before
 * scrollTo clamps against it — its own auto-resize is async (ResizeObserver),
 * too late for this synchronous check.
 */
export function useHomeEntryScroll() {
  const { hash } = useLocation();
  const lenis = useLenis();

  useLayoutEffect(() => {
    lenis?.resize();
    const saved = sessionStorage.getItem(KEY);
    if (hash === '#work' && saved != null) {
      sessionStorage.removeItem(KEY);
      const target = parseInt(saved, 10) || 0;
      if (lenis) lenis.scrollTo(target, { immediate: true });
      else window.scrollTo({ top: target, behavior: 'instant' });
      return;
    }
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        if (lenis) lenis.scrollTo(el, { immediate: true });
        else el.scrollIntoView();
      }
    }
  }, [hash, lenis]);
}
