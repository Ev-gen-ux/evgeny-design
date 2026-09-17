import { useEffect, type RefObject } from 'react';

/**
 * Continuous-scroll driver for the case page's AgentSessionTimeline dots/
 * outcomes + the STAGE-badge fallback text — split out of useCaseTimeline.ts
 * (see that file's sibling useCaseSectionLabels for why) since a hook that
 * both returns data and mutates externally-passed refs trips
 * eslint-plugin-react-hooks' React Compiler ruleset. Deferring even the
 * *first* update through requestAnimationFrame (not calling it synchronously
 * in the effect body) also matters here — the linter's escape analysis only
 * recognizes ref mutations as safely outside the render/commit window once
 * they're behind that async boundary, matching every other continuous
 * scroll-driver on this site (usePipelineScroll, useAssemblyAnimation, ...).
 *
 * Outcome-swap logic (real text ↔ "Working…") mirrors usePipelineScroll's
 * exact behavior for the same component, reused here per user request
 * (2026-08-02) — same AgentSessionTimeline, same state machine driving it.
 */
export function useCaseTimelineDrive(
  mainRef: RefObject<HTMLElement | null>,
  badgeTextRef: RefObject<HTMLElement | null>,
  dotRefs: RefObject<(HTMLElement | null)[]>,
  outcomeRefs: RefObject<(HTMLElement | null)[]>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;
    const main = mainRef.current;
    if (!main) return;
    const sections = Array.from(main.querySelectorAll<HTMLElement>(':scope > section'));
    const n = sections.length;
    if (!n) return;

    let lastBadgeText = '';
    const lastState: string[] = Array.from({ length: n }, () => '');

    const update = () => {
      const vh = window.innerHeight;
      const sy = window.scrollY;

      let stageIndex = 0;
      for (let i = 0; i < n; i++) {
        const top = sections[i].getBoundingClientRect().top + sy;
        if (sy >= top - vh * 0.5) stageIndex = i;
      }

      const docH = document.documentElement.scrollHeight;
      const scrollable = Math.max(1, docH - vh);
      const progressPercent = Math.min(100, Math.max(0, Math.round((sy / scrollable) * 100)));

      const badgeText = `STAGE ${String(stageIndex + 1).padStart(2, '0')}/${String(n).padStart(2, '0')} · ${progressPercent}%`;
      if (badgeText !== lastBadgeText && badgeTextRef.current) {
        lastBadgeText = badgeText;
        badgeTextRef.current.textContent = badgeText;
      }

      const dots = dotRefs.current;
      const outcomes = outcomeRefs.current;
      for (let i = 0; i < n; i++) {
        const state = i < stageIndex ? 'done' : i > stageIndex ? 'pending' : 'active';
        if (lastState[i] === state) continue;
        lastState[i] = state;
        const dot = dots[i];
        if (dot) dot.dataset.state = state;
        const outcome = outcomes[i];
        if (outcome) {
          outcome.dataset.state = state;
          outcome.textContent = state === 'active' ? 'Working…' : outcome.dataset.outcome || '';
        }
      }
    };

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        update();
        rafId = 0;
      });
    };
    const initial = requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(initial);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [mainRef, badgeTextRef, dotRefs, outcomeRefs, enabled]);
}
