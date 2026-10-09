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
 * Strips the hash from the URL right after acting on it (2026-10-09, mobile
 * header-logo bug: tap landed on "О себе" instead of the hero). `html` has
 * global `scroll-behavior: smooth` (index.css). A URL that still has a
 * `#hash` matching a live element is, per spec, an "indicated part" the
 * browser itself tries to scroll to on navigation/layout settling — a step
 * fully separate from both Lenis and this effect, which can fire *after*
 * our own correction (confirmed via an rAF trace: a second, smoothly-eased
 * scroll from the correct position back toward where "about" lands, ~400ms
 * later, racing a slower layout settle more common on mobile). As long as
 * any `#hash` remains in the URL this native step stays armed and can refire
 * on any later layout shift. `replaceState` removes the hash without another
 * navigation entry, disarming it for good — then nothing is left to race.
 *
 * useLayoutEffect, not useEffect (2026-08-02, "jerky" page-transition fix):
 * useEffect runs after paint, so Home briefly flashed at whatever scroll
 * position (usually 0) it happened to mount at before snapping to the
 * restored position a frame later. useLayoutEffect applies the correction
 * before the browser ever paints the wrong position. lenis.resize() first
 * so its cached document-height/limit reflects Home's actual content before
 * scrollTo clamps against it — its own auto-resize is async (ResizeObserver),
 * too late for this synchronous check.
 *
 * Mobile watchdog (2026-10-09, logo tap from a /work/:id page landing on
 * "О себе" instead of the hero): on narrow viewports, something downstream
 * of this effect re-animates the scroll position away from the target we
 * just set, over roughly 400ms — confirmed via a frame-by-frame scrollY
 * trace, but the exact call site couldn't be pinned down (every instrumented
 * entry point showed zero calls while the drift still happened, including a
 * manual, directly-invoked `scrollTo()` on the live Lenis instance — points
 * to something in Lenis's own internals reacting to a layout/resize signal
 * mid-animation, not to application code). Rather than keep chasing the root
 * cause, `settleScrollTo` reasserts the target for a short window after the
 * initial jump, so whatever nudges the scroll away gets overridden a frame
 * later. Desktop/tablet aren't touched — this is the one thing the reported
 * bug was scoped to.
 */
const MOBILE_MAX_WIDTH = 640;
const WATCHDOG_MS = 700;
const DRIFT_TOLERANCE_PX = 2;

function settleScrollTo(lenis: ReturnType<typeof useLenis> | null, target: number) {
  const apply = () => {
    if (lenis) lenis.scrollTo(target, { immediate: true });
    else window.scrollTo({ top: target, behavior: 'instant' });
  };
  apply();

  if (window.innerWidth > MOBILE_MAX_WIDTH) return;

  const deadline = performance.now() + WATCHDOG_MS;
  const tick = () => {
    if (Math.abs(window.scrollY - target) > DRIFT_TOLERANCE_PX) apply();
    if (performance.now() < deadline) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function useHomeEntryScroll() {
  const { hash } = useLocation();
  const lenis = useLenis();

  useLayoutEffect(() => {
    lenis?.resize();
    const saved = sessionStorage.getItem(KEY);
    if (hash === '#work' && saved != null) {
      sessionStorage.removeItem(KEY);
      const target = parseInt(saved, 10) || 0;
      settleScrollTo(lenis, target);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        // Reading the live `getBoundingClientRect().top` + the browser's actual
        // `window.scrollY` gives Lenis a real absolute pixel target instead of
        // passing the element itself (which it'd resolve against its own
        // internally-tracked `animatedScroll`, stale while a touch-driven
        // inertia scroll is still settling) — see this file's own docstring.
        const target = el.getBoundingClientRect().top + window.scrollY;
        settleScrollTo(lenis, target);
      }
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [hash, lenis]);
}
