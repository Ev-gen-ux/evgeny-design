import { runtimeTokens } from '../tokens';
import { useEffect } from 'react';

/** Shared controller for the footer's cursor-follow interaction. */
export function useInteractiveMagnet(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const originals = new Map<HTMLElement, { translate: string; transition: string }>();
    let active: HTMLElement | null = null;
    let bounds: DOMRect | null = null;
    const reset = () => {
      if (active) active.style.translate = originals.get(active)?.translate ?? '';
      active = null;
      bounds = null;
    };
    const targetFor = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const el = target.closest<HTMLElement>('a[href], button:not(:disabled), [role="button"]');
      // Full-card overlay anchors have no visible content of their own.
      if (!el || (!el.textContent?.trim() && !el.querySelector('svg, img'))) return null;
      return el;
    };
    const onMove = (event: PointerEvent) => {
      if (!media.matches || event.pointerType !== 'mouse') { reset(); return; }
      const el = targetFor(event.target);
      if (!el) { reset(); return; }
      if (active !== el) {
        reset();
        if (!originals.has(el)) {
          originals.set(el, { translate: el.style.translate, transition: el.style.transition });
          const existing = getComputedStyle(el).transition;
          el.style.transition = `${existing}, translate ${runtimeTokens.magnet.durationMs}ms ${runtimeTokens.magnet.easing}`;
        }
        active = el;
        bounds = el.getBoundingClientRect();
      }
      if (!bounds) return;
      // Same x/y response as useMagnetHover; cap large email/CTA targets.
      const x = Math.max(-runtimeTokens.magnet.limitX, Math.min(runtimeTokens.magnet.limitX, (event.clientX - bounds.left - bounds.width / 2) * runtimeTokens.magnet.responseX));
      const y = Math.max(-runtimeTokens.magnet.limitY, Math.min(runtimeTokens.magnet.limitY, (event.clientY - bounds.top - bounds.height / 2) * runtimeTokens.magnet.responseY));
      el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
    };
    const onOut = (event: PointerEvent) => {
      if (active && (!(event.relatedTarget instanceof Node) || !active.contains(event.relatedTarget))) reset();
    };
    const onScroll = () => reset();
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('blur', reset);
    media.addEventListener('change', reset);
    return () => {
      reset();
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('blur', reset);
      media.removeEventListener('change', reset);
      originals.forEach((original, el) => {
        el.style.translate = original.translate;
        el.style.transition = original.transition;
      });
    };
  }, [enabled]);
}
