import { useEffect, type RefObject } from 'react';

function docTop(el: HTMLElement): number {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return y;
}

/**
 * Prototype for the "wheel carousel" case-list layout (evaluating a replacement
 * for the plain card list, per user request 2026-09-23 — not committed yet).
 * Same pinned-scroll shape as `usePipelineScroll`: section is `count*100vh` tall
 * with a `position:sticky` frame inside; scroll position maps to a continuous
 * index `t` across the N cases. Kept much simpler than Pipeline's hook (no
 * per-letter text sync, no agent-session log) — just `t`, written to a ref
 * every frame via `onFrame` so the caller can drive its own DOM writes without
 * a React re-render per scroll tick, matching the rest of the site's
 * scroll-driven sections.
 */
export function useWorkWheelScroll(sectionRef: RefObject<HTMLElement | null>, count: number, onFrame: (t: number) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let curT = 0;
    let curTSet = false;
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = now - last;
      last = now;
      const sec = sectionRef.current;
      if (sec) {
        const vh = window.innerHeight;
        const top = docTop(sec);
        const scrollable = Math.max(1, sec.offsetHeight - vh);
        const p = Math.max(0, Math.min(1, (window.scrollY - top) / scrollable));
        const rawT = p * (count - 1);
        if (!curTSet) {
          curT = rawT;
          curTSet = true;
        } else {
          const ease = 1 - Math.pow(0.0001, Math.min(0.05, (dt || 16) / 1000));
          curT += (rawT - curT) * ease;
          if (Math.abs(rawT - curT) < 0.0008) curT = rawT;
        }
        onFrame(curT);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [sectionRef, count, onFrame, enabled]);
}
