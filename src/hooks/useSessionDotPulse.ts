import { useEffect, type RefObject } from 'react';

/**
 * Drives the header's session-status dot (2026-08-03, replaces a CSS
 * `animation: sessionPulse 1.8s infinite` loop) — per a design-anti-slop
 * audit finding (catalog T23: a status dot that pulses forever with no real
 * event behind it is a recognizable AI-generated-UI tell). The dot now
 * reacts to actual scroll activity instead of looping on a timer: its ring
 * flares out while you're actively scrolling and settles back to a plain
 * dot once you stop, so the "session is live" read is tied to something
 * real happening on the page rather than a decorative loop.
 *
 * Same shape as the site's other scroll-driven hooks (usePipelineScroll,
 * useChatBar): a continuous rAF loop reading `window.scrollY` fresh every
 * frame (not a scroll-event listener, so the ring can decay smoothly even
 * after the user stops scrolling), writing directly to the DOM via a ref —
 * void-returning, no React state.
 */
export function useSessionDotPulse(dotRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    if (!dot) return;

    let lastScrollY = window.scrollY;
    let activity = 0;
    let lastRing = -1;
    let lastOpacity = -1;

    const step = () => {
      const sy = window.scrollY;
      const delta = Math.abs(sy - lastScrollY);
      lastScrollY = sy;

      // Each pixel scrolled this frame nudges activity up (capped at 1);
      // every frame it also decays back toward 0 — net effect: a burst
      // while scrolling, a smooth fade-out once you stop.
      activity = Math.min(1, activity + delta * 0.05);
      activity *= 0.9;

      const ring = Math.round(activity * 40) / 10; // 0..4, quantized to avoid sub-pixel style churn
      const opacity = Math.round((1 - activity * 0.3) * 100) / 100;
      if (ring !== lastRing) {
        lastRing = ring;
        dot.style.boxShadow = ring > 0.05 ? `0 0 0 ${ring.toFixed(1)}px rgba(var(--color-accent-rgb), ${(activity * 0.45).toFixed(3)})` : 'none';
      }
      if (opacity !== lastOpacity) {
        lastOpacity = opacity;
        dot.style.opacity = opacity.toFixed(2);
      }

      raf = requestAnimationFrame(step);
    };

    let raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [dotRef, enabled]);
}
