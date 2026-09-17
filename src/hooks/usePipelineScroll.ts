import { useEffect, type RefObject } from 'react';
import { pipelineSync } from './pipelineSync';

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
 * 1:1 with plScrollState()/drivePipeline() in Portfolio.dc.html — the pinned
 * scrollytelling engine for #pipeline.
 *
 * Smoothness pass (2026-08-02): this used to recompute on the 'scroll' event
 * (throttled to one rAF) and push every panel's opacity/transform through
 * React `setState` — a re-render of the whole section on essentially every
 * animation frame while inside the pinned zone, with *zero* smoothing on top
 * (raw scroll position mapped straight to panel style, so any scroll-sampling
 * jitter showed up directly, un-damped, on the site's most elaborate scroll
 * section). Rewritten to a continuous rAF loop that lerps the raw scroll
 * progress toward a smoothed value (same time-corrected exponential-decay
 * shape as the assembly hooks, tuned much snappier — this is a scrubbed,
 * pinned sequence people expect to track their scroll input tightly, not a
 * text reveal that can afford to lag) and writes panel opacity/transform and
 * the "agent session" step dots/outcomes directly to the DOM via refs —
 * bypassing React entirely for the per-frame values, the same pattern
 * useAssemblyAnimation already uses for text spans. The K constant below
 * (0.0001) is a first guess at "just enough to kill jitter, not enough to
 * feel laggy" — needs a live look to confirm the feel is right.
 *
 * The numeric "0X/05" counter + progress bar were removed 2026-08-02, per
 * user request, in favor of the "AGENT SESSION" step list (see
 * content/pipeline.ts's `agentSessionSteps`) — a simulated tool-call log
 * whose dots/outcome text already carry the 1-of-5 progress, so a separate
 * bar was judged redundant.
 */
export function usePipelineScroll(
  sectionRef: RefObject<HTMLElement | null>,
  panelRefs: RefObject<(HTMLElement | null)[]>,
  stepDotRefs: RefObject<(HTMLElement | null)[]>,
  stepOutcomeRefs: RefObject<(HTMLElement | null)[]>,
  stepRowRefs: RefObject<(HTMLElement | null)[]>,
  panelCount: number,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) {
      // Stacked layout (2026-09-17, responsive pass — narrow viewport OR
      // reduced motion): nothing else ever drives `pipelineSync.leftT`/
      // `panelT`/`stepT` while this hook is disabled, but useAssemblyAnimation
      // keeps its own independent rAF loop running regardless and reads those
      // same values every frame to scatter/reassemble every `data-pl-fixed`/
      // `data-pl-panel`/`data-pl-step` text span. Left at their 0 default,
      // every letter in Pipeline (left-column heading, stage panels, AGENT
      // SESSION verb/target/outcome) stays permanently scattered — invisible,
      // reading as empty bordered boxes. A single synchronous write to 1 here
      // is enough: useAssemblyAnimation's own loop picks it up and animates to
      // the assembled state on its own, no rAF loop needed on this side.
      const N = panelCount;
      pipelineSync.leftT = 1;
      pipelineSync.active = false;
      for (let i = 0; i < N; i++) {
        pipelineSync.panelT[i] = 1;
        pipelineSync.stepT[i] = 1;
      }
      // DOM ref writes deferred into a rAF callback, not done synchronously
      // above — same reason every other ref mutation in this file lives
      // inside `step()`'s rAF-scheduled callback rather than directly in the
      // effect body (eslint-plugin-react-hooks' `immutability` rule flags a
      // ref write that happens synchronously during the render/effect pass).
      const raf = requestAnimationFrame(() => {
        for (let i = 0; i < N; i++) {
          const dot = stepDotRefs.current[i];
          if (dot) {
            dot.style.transform = 'scale(1)';
            dot.style.opacity = '1';
            dot.dataset.state = 'done';
          }
          const row = stepRowRefs.current[i];
          if (row) row.style.setProperty('--agent-line-progress', '1');
          const outcome = stepOutcomeRefs.current[i];
          if (outcome) outcome.dataset.state = 'done';
        }
      });
      return () => cancelAnimationFrame(raf);
    }
    const N = panelCount;
    let curP = 0;
    let curPSet = false;
    const lastPanel: { op: number; dy: number; pe: string }[] = Array.from({ length: N }, () => ({ op: -1, dy: NaN, pe: '' }));
    const lastStepState: string[] = Array.from({ length: N }, () => '');

    const step = (dt: number) => {
      const sec = sectionRef.current;
      if (!sec) return;
      const vh = window.innerHeight;
      const top = docTop(sec);
      const scrollable = Math.max(1, sec.offsetHeight - vh);
      const rawRatio = (window.scrollY - top) / scrollable;
      const pRaw = Math.max(0, Math.min(1, rawRatio));

      if (!curPSet) {
        curP = pRaw;
        curPSet = true;
      } else {
        const ease = 1 - Math.pow(0.0001, Math.min(0.05, (dt || 16) / 1000));
        curP += (pRaw - curP) * ease;
        if (Math.abs(pRaw - curP) < 0.0004) curP = pRaw;
      }
      const p = curP;

      const LEAD = 0.1;
      const leftT = Math.max(0, Math.min(1, p / (LEAD * 0.8)));
      const rp = Math.max(0, (p - LEAD) / (1 - LEAD));
      const fp = Math.min(N - 0.0001, rp * N);
      const active = Math.floor(fp);
      const local = fp - active;
      // `rawRatio < 1` (unclamped), not just `p` — `p`/pRaw are both clamped to
      // [0,1], so once you've scrolled genuinely past the section's bottom,
      // they just sit at 1 forever, indistinguishable from "still right at the
      // pinned boundary." Without the unclamped check, `started` (and
      // pipelineSync.active, downstream) never turns false again after the
      // section is scrolled past — the bug reported 2026-08-02: the icosahedron's
      // Pipeline-stage highlight stayed lit permanently once you'd scrolled by.
      const started = p > LEAD * 0.55 && rawRatio < 1;

      pipelineSync.leftT = leftT;
      pipelineSync.active = started;
      pipelineSync.activeIndex = active;
      const panelT = pipelineSync.panelT;

      // Moved above the panel loop (2026-08-03) — used to be set *after* it,
      // so the panel loop always saw last frame's (stale) value. Needed now
      // because the last panel (the "outcome"/Handoff content) reads it
      // this same frame: see the `!started` branch below.
      if (rawRatio >= 1) {
        pipelineSync.completed = true;
      }

      const panels = panelRefs.current;
      for (let i = 0; i < N; i++) {
        let op: number;
        let dy: number;
        let at: number;
        if (!started) {
          // Scrolled genuinely past the end (not just back in the dead
          // zone — `rawRatio >= 1` distinguishes them, same check as the
          // AGENT SESSION list below) — the last panel (outcome/Handoff)
          // stays fully shown instead of fading to nothing, matching the
          // dots/text's own "stays done" convention. Reported 2026-08-03:
          // the AGENT SESSION list correctly stayed lit green, but the
          // right-side content it refers to (the actual outcome panel) had
          // no equivalent exception and always went blank here.
          if (pipelineSync.completed && rawRatio >= 1 && i === N - 1) {
            op = 1;
            dy = 0;
            at = 1;
          } else {
            op = 0;
            dy = 70;
            at = 0;
          }
        } else if (i < active) {
          op = 0;
          dy = -70;
          at = 1;
        } else if (i > active) {
          op = 0;
          dy = 70;
          at = 0;
        } else {
          const leave = i === N - 1 ? 0 : Math.max(0, (local - 0.84) / 0.16);
          op = 1 - leave;
          dy = -leave * 70;
          at = Math.max(0, Math.min(1, local / 0.42));
        }
        panelT[i] = at;

        const el = panels[i];
        if (!el) continue;
        const last = lastPanel[i];
        if (last.op !== op || last.dy !== dy) {
          last.op = op;
          last.dy = dy;
          el.style.opacity = op.toFixed(3);
          el.style.transform = `translateY(calc(-50% + ${dy.toFixed(1)}px))`;
        }
        const pe = op > 0.5 ? 'auto' : 'none';
        if (last.pe !== pe) {
          last.pe = pe;
          el.style.pointerEvents = pe;
        }
      }

      const dots = stepDotRefs.current;
      const outcomes = stepOutcomeRefs.current;
      const rows = stepRowRefs.current;
      for (let i = 0; i < N; i++) {
        let state: string;
        if (!started) {
          // `completed` is a one-way flag (see docstring) — correct for the
          // "scrolled past the bottom, stay green" case it was built for, but
          // it doesn't know *which* side of the section `!started` means.
          // Without the `rawRatio >= 1` check, re-entering the dead zone at
          // the *top* (LEAD) after already completing Pipeline once earlier
          // in the session — a totally normal thing to do while scrolling
          // back up to re-check something — showed every step green while
          // the panel itself was blank (nothing rendered yet, correctly, at
          // that scroll position): a visibly broken-looking combination,
          // reported 2026-08-03. `completed` should only make the list read
          // "all done" when the *reason* we're not started is having scrolled
          // past the end, not when we're simply above it and haven't reached
          // the dead-zone threshold yet.
          state = pipelineSync.completed && rawRatio >= 1 ? 'done' : 'pending';
        } else if (i < active) {
          state = 'done';
        } else if (i > active) {
          state = 'pending';
        } else {
          state = 'active';
        }
        // stepT mirrors `state` exactly, every frame (not the discrete-change
        // gate below) — reported 2026-08-03: the text used to use a one-way
        // "max ever reached" ratchet, so it stayed assembled forever once
        // reached, even scrolling back up well past the dead zone, until a
        // hard reload. `state` already resets correctly there (the
        // `!started` branch above), so mirroring it keeps the text in sync
        // with what the dots/outcome show instead of a second, looser memory
        // of its own: 'done' stays fully assembled, 'pending' stays
        // scattered, 'active' tracks the live per-letter reveal via panelT[i].
        pipelineSync.stepT[i] = state === 'done' ? 1 : state === 'pending' ? 0 : panelT[i];
        const t = pipelineSync.stepT[i];

        // Dot scale/opacity and the connecting line's fill (2026-08-03, per
        // explicit request: "assemble on scroll down, disassemble on scroll
        // up," for the bullets and lines, not just the color/text) — written
        // every frame, *not* gated behind the `state`-change check below,
        // because `t` keeps changing continuously while a step is 'active'
        // (the smooth per-letter-reveal value), not just on discrete
        // pending→active→done transitions.
        const dot = dots[i];
        if (dot) {
          const scale = (0.35 + t * 0.65).toFixed(3);
          dot.style.transform = `scale(${scale})`;
          dot.style.opacity = (0.35 + t * 0.65).toFixed(3);
        }
        const row = rows[i];
        if (row) row.style.setProperty('--agent-line-progress', t.toFixed(3));

        if (lastStepState[i] === state) continue;
        lastStepState[i] = state;
        if (dot) dot.dataset.state = state;
        // No longer swaps textContent to "Working…" (2026-08-03, per user
        // request) — the outcome text now assembles in via `data-pl-step`
        // like verb/target, so its own scatter→reassemble motion already
        // reads as "this step is in progress," and a JS-driven textContent
        // overwrite would just clobber the assembly spans it just built.
        // `data-state` stays: CSS still colors the (inherited, cascades to
        // the child spans) text by state — accent while active, dimmed while
        // pending, normal once done.
        const outcome = outcomes[i];
        if (outcome) outcome.dataset.state = state;
      }
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      step(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sectionRef, panelRefs, stepDotRefs, stepOutcomeRefs, stepRowRefs, panelCount, enabled]);
}
