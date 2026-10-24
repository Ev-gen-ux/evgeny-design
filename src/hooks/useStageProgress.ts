import { useEffect, type RefObject } from 'react';

/** 1:1 with STAGE_HUES in Portfolio.dc.html — hero/about/work/skills/(implicit contact). */
export const STAGE_HUES = [25, 60, 15, 190, 300];

export interface StageBackdropRefs {
  washRef: RefObject<HTMLElement | null>;
  blobOuterRefs: RefObject<(HTMLElement | null)[]>;
  blobInnerRefs: RefObject<(HTMLElement | null)[]>;
  progressFillRef: RefObject<HTMLElement | null>;
}

function computeStageOffsets(): number[] {
  const offsets = [0, 0, 0, 0, 0];
  const sy = window.scrollY;
  document.querySelectorAll('[data-stage-anchor]').forEach((el) => {
    const idx = parseInt(el.getAttribute('data-stage-anchor') || '0', 10);
    if (idx >= 0 && idx < offsets.length) offsets[idx] = el.getBoundingClientRect().top + sy;
  });
  return offsets;
}

/**
 * 1:1 with the stageIndex/stageColor/progressPercent block in renderVals() —
 * a continuous hue sweep across STAGE_HUES as you scroll between the sections
 * carrying `data-stage-anchor` (Hero/About/Work/Skills; index 4 has no anchor
 * in the source either, stays 0 — not something to "fix", just how it ships).
 *
 * Smoothness pass (2026-08-02): this used to push every field through React
 * `setState` on every scroll frame — a scroll-driven re-render of the *entire
 * page tree* on close to every animation frame while scrolling, easily the
 * single biggest source of "the whole site feels tied to scroll". Rewritten
 * to write directly to the DOM, with no React state: `--stage-color`/
 * `--stage-hue` are set as CSS custom properties on `documentElement` once
 * per frame, and PageBackdrop (wash/meshBlobs/progress-bar) owns its own
 * refs that this hook writes into directly, same pattern as
 * usePipelineScroll. (Hero/About/SelectedWork/Skills used to carry their own
 * "0X · LABEL" eyebrow tags colored from `--stage-color` — those were
 * removed 2026-08-03 as vestigial once the you/agent PromptSteps mechanic
 * took over each section's framing; the hue sweep itself still drives the
 * wash/blobs/progress-bar, unrelated to that removal.)
 * Hue gets a light lerp (jitter smoothing); scroll-driven parallax transforms
 * intentionally stay unsmoothed — parallax is expected to track scroll input
 * tightly, unlike a color sweep.
 *
 * Scroll-jank fix (2026-10-24): this used to run `step()` in a perpetual,
 * ungated `requestAnimationFrame` loop for the entire page lifetime, calling
 * `computeStageOffsets()` — a `querySelectorAll` + `getBoundingClientRect()`
 * forced-synchronous-layout read — on every single frame forever, whether or
 * not the page was scrolling. That's the same anti-pattern `useScrollReveal`
 * already avoids: now the expensive layout read only happens once up front
 * and again on resize (section positions don't change on their own), and the
 * animation loop itself only runs while there's live scroll input or the hue
 * easing hasn't settled yet — it stops itself once `curHue` reaches its
 * target and restarts on the next scroll/resize event, mirroring
 * `useScrollReveal`'s passive-listener + rAF-throttle pattern instead of
 * polling layout forever.
 */
export function useStageProgress(refs: StageBackdropRefs, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const { washRef, blobOuterRefs, blobInnerRefs, progressFillRef } = refs;

    let offsets = computeStageOffsets();

    let curHue = STAGE_HUES[0];
    let curHueSet = false;
    let lastStageColor = '';
    let lastMono = document.documentElement.dataset.theme === 'mono';
    let lastProgressPercent = -1;
    const lastBlobTransform: string[] = [];
    const lastBlobColor: string[] = [];

    /** Returns true once the hue easing has fully settled on its target — the loop can stop until the next scroll/resize. */
    const step = (dt: number): boolean => {
      const vh = window.innerHeight;
      const sy = window.scrollY;

      let stageIndex = 0;
      for (let i = 0; i < offsets.length; i++) {
        if (sy >= offsets[i] - vh * 0.5) stageIndex = i;
      }
      const nextIdx = Math.min(stageIndex + 1, offsets.length - 1);
      let localT = 0;
      if (nextIdx !== stageIndex && offsets[nextIdx] > offsets[stageIndex]) {
        localT = Math.min(1, Math.max(0, (sy - (offsets[stageIndex] - vh * 0.5)) / (offsets[nextIdx] - offsets[stageIndex])));
      }
      const hueA = STAGE_HUES[stageIndex];
      const hueB = STAGE_HUES[nextIdx];
      const hueTarget = hueA + (hueB - hueA) * localT;

      if (!curHueSet) {
        curHue = hueTarget;
        curHueSet = true;
      } else {
        const ease = 1 - Math.pow(0.0005, Math.min(0.05, (dt || 16) / 1000));
        curHue += (hueTarget - curHue) * ease;
        if (Math.abs(hueTarget - curHue) < 0.02) curHue = hueTarget;
      }
      const hue = curHue;
      const hueStr = hue.toFixed(1);

      const docH = document.documentElement.scrollHeight;
      const scrollable = Math.max(1, docH - vh);
      const progressPercent = Math.min(100, Math.max(0, Math.round((sy / scrollable) * 100)));
      // Mono theme (2026-09-17): the hue sweep is the single biggest source of
      // color on the page (a full-bleed conic-gradient wash + 2 of the 4
      // ambient blobs), and none of it is reachable through the CSS token
      // overrides in theme-mono.css — it's computed here as OKLCH strings and
      // written straight to `.style`, which always wins over any stylesheet
      // rule for the same property. Zeroing the chroma component keeps the
      // lightness sweep (so the wash still subtly breathes) but drops all hue,
      // rendering pure grey — checked fresh every frame since the toggle can
      // flip at any time without remounting this hook.
      const mono = document.documentElement.dataset.theme === 'mono';
      const c0 = mono ? 0 : 0.18;
      const c1 = mono ? 0 : 0.05;
      const c2 = mono ? 0 : 0.045;
      const c3 = mono ? 0 : 0.035;
      const stageColor = `oklch(0.65 ${c0} ${hueStr})`;

      if (stageColor !== lastStageColor || mono !== lastMono) {
        lastStageColor = stageColor;
        lastMono = mono;
        document.documentElement.style.setProperty('--stage-color', stageColor);
        document.documentElement.style.setProperty('--stage-hue', hueStr);

        if (washRef.current) {
          washRef.current.style.background = `conic-gradient(from 120deg at 30% 20%, oklch(var(--wash-l1) ${c1} ${hueStr}) 0deg, oklch(var(--wash-l2) ${c2} ${(hue + 55).toFixed(1)}) 130deg, oklch(var(--wash-l3) ${c3} ${(hue - 65).toFixed(1)}) 250deg, oklch(var(--wash-l1) ${c1} ${hueStr}) 360deg)`;
        }
        const inners = blobInnerRefs.current;
        for (let i = 0; i < inners.length; i++) {
          const el = inners[i];
          if (!el) continue;
          const alpha = el.dataset.dynAlpha;
          if (!alpha) continue;
          const color = `radial-gradient(circle, oklch(0.65 ${c0} ${hueStr} / ${alpha}), transparent 70%)`;
          if (lastBlobColor[i] !== color) {
            lastBlobColor[i] = color;
            el.style.background = color;
          }
        }
        if (progressFillRef.current) progressFillRef.current.style.background = stageColor;
      }

      const outers = blobOuterRefs.current;
      for (let i = 0; i < outers.length; i++) {
        const el = outers[i];
        if (!el) continue;
        const factor = parseFloat(el.dataset.parallaxFactor || '0');
        const transform = `translate3d(0,${(sy * factor).toFixed(1)}px,0)`;
        if (lastBlobTransform[i] !== transform) {
          lastBlobTransform[i] = transform;
          el.style.transform = transform;
        }
      }

      if (progressPercent !== lastProgressPercent) {
        lastProgressPercent = progressPercent;
        if (progressFillRef.current) progressFillRef.current.style.width = `${progressPercent}%`;
      }

      return curHue === hueTarget;
    };

    let raf = 0;
    let running = false;
    let last = performance.now();

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    };

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      const settled = step(dt);
      if (settled) {
        stop();
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const ensureRunning = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    // Settle the initial scroll position once on mount (e.g. a reload mid-page).
    ensureRunning();

    const onScroll = () => ensureRunning();
    const onResize = () => {
      offsets = computeStageOffsets();
      ensureRunning();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      stop();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
    // `refs` intentionally omitted: its individual ref objects (from useRef)
    // are stable across renders even if the wrapping object literal isn't —
    // only their `.current` mutates, read fresh every frame inside step().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
