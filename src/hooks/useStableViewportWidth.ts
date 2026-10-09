import { useEffect, useState } from 'react';

/**
 * `document.documentElement.clientWidth` (2026-09-18) — deliberately NOT
 * `window.innerWidth` (see useWindowWidth, the site's other width hook):
 * `innerWidth` includes whatever space a scrollbar currently occupies,
 * `clientWidth` never does. Built specifically to give Header's `.nav` a
 * JS-measured `width` instead of `right: 0`, after two CSS-only attempts
 * (`scrollbar-gutter: stable`, then `stable both-edges` — see Header.
 * module.css's own history) failed to keep the mobile menu trigger's right-
 * edge padding stable across scroll positions.
 *
 * Root cause, as best determined without live device access: macOS's
 * default "show scrollbars: when scrolling" preference makes Chrome's
 * scrollbar an overlay that only reserves layout width while actively
 * scrolling, not at rest — for a `position: fixed; left: 0; right: 0`
 * element, that toggle changes what "right: 0" resolves against several
 * times per scroll gesture, exactly matching the reported "hugs the edge,
 * then springs back, tied to scroll" symptom. `clientWidth`, read via JS
 * rather than resolved by the CSS engine's own viewport/scrollbar
 * bookkeeping, isn't affected by that transient reservation — measuring it
 * once and holding the value steady removes the ambiguity outright, rather
 * than trying to get a CSS property to describe a moving target correctly.
 *
 * Re-measures only on `resize` (matching useWindowWidth's own convention)
 * — never on scroll, since the whole point is to stop being sensitive to
 * scroll-driven scrollbar visibility changes.
 */
export function useStableViewportWidth(): number | undefined {
  const [width, setWidth] = useState<number | undefined>(() =>
    typeof document !== 'undefined' ? document.documentElement.clientWidth : undefined,
  );

  useEffect(() => {
    const onResize = () => setWidth(document.documentElement.clientWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
}
