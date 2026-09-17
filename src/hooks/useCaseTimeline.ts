import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Case-page timeline — supersedes the old useCaseStageProgress (2026-08-02,
 * per user request): discovers each `<section>`'s own short label (its
 * `.sectionTag` div — always the section's first child, e.g. "01 · problem" —
 * read directly off the DOM rather than duplicated into new content, so
 * there's exactly one source for that text). Runs once via useLayoutEffect +
 * a single setState (not a per-scroll-frame update — the anti-pattern this
 * project has eliminated elsewhere is continuous state churn tied to scroll,
 * not a one-time structural read on mount).
 *
 * The actual per-frame progress (STAGE-badge text + CaseTimeline's dot
 * states) lives in the sibling hook useCaseTimelineDrive — split out because
 * a hook that both returns data *and* mutates externally-passed refs trips
 * eslint-plugin-react-hooks' React Compiler ruleset (see that file's
 * docstring for the "why," it's a real linter constraint, not a style choice).
 */
export function useCaseSectionLabels(mainRef: RefObject<HTMLElement | null>, enabled: boolean): string[] {
  const [labels, setLabels] = useState<string[]>([]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const main = mainRef.current;
    if (!main) return;
    const sections = Array.from(main.querySelectorAll<HTMLElement>(':scope > section'));
    setLabels(sections.map((s) => s.children[0]?.textContent?.trim() || ''));
  }, [mainRef, enabled]);

  return labels;
}
