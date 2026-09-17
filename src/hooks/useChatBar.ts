import { useEffect, type RefObject } from 'react';
import { docTop } from './asmMath';
import { chatBar } from '../content/chatBar';

interface ChatLine {
  text: string;
  top: number;
}

const MS_PER_CHAR = 32;

/**
 * Drives the persistent bottom ChatBar (added 2026-08-03, per user request —
 * "option A": one line per section, typed once on arrival, held until the
 * next). Scans the DOM once for every `[data-chat-line]` span (About/
 * SelectedWork/Projects/Experience/Skills/Education/Contact's own PromptSteps
 * questions — Hero and Pipeline don't have one, by earlier explicit design,
 * so they're simply not candidates: scrolling through Pipeline just holds
 * whatever line came before it, the same way a real chat log holds its last
 * message while you're not actively sending a new one), then on every frame
 * of a continuous rAF loop (not a scroll-event listener — the typewriter
 * needs to keep advancing even if the user stops scrolling mid-line):
 *  1. finds which line's section you've scrolled to (same "which stage are
 *     we past" pattern as useCaseTimelineDrive's stageIndex loop),
 *  2. types that line in at a fixed, natural pace (not scroll-scrubbed like
 *     the rest of the site's animations — a real typing cadence reads more
 *     like an actual chat than a scrubbed reveal would here),
 *  3. once the real page bottom is reached, swaps in a closing line and a
 *     "session closed" status — matching the reference screenshot.
 *
 * Deliberately void-returning, not returning the current line/index: a hook
 * that both returns a value and mutates externally-passed refs trips
 * eslint-plugin-react-hooks' React Compiler ruleset (see usePipelineScroll's
 * docstring for the full "why") — this only ever writes into the refs it's
 * given, same shape as that hook.
 */
export function useChatBar(
  rootRef: RefObject<HTMLElement | null>,
  barRef: RefObject<HTMLElement | null>,
  textRef: RefObject<HTMLElement | null>,
  statusDotRef: RefObject<HTMLElement | null>,
  statusTextRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;

    const lineEls = Array.from(root.querySelectorAll<HTMLElement>('[data-chat-line]'));
    const lines: ChatLine[] = lineEls.map((el) => ({ text: el.textContent?.trim() || '', top: docTop(el) }));
    if (!lines.length) return;

    let curIdx = -1;
    let lineStart = 0;
    let lastCharCount = -1;
    let lastVisible = false;
    let lastDotState = '';
    let lastStatusText = '';
    let closedShown = false;

    const setStatus = (dotState: string, text: string) => {
      if (lastDotState !== dotState) {
        lastDotState = dotState;
        if (statusDotRef.current) statusDotRef.current.dataset.state = dotState;
      }
      if (lastStatusText !== text) {
        lastStatusText = text;
        if (statusTextRef.current) statusTextRef.current.textContent = text;
      }
    };

    const update = (now: number) => {
      const vh = window.innerHeight;
      const sy = window.scrollY;
      const atBottom = sy + vh >= document.documentElement.scrollHeight - 4;

      let idx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (sy >= lines[i].top - vh * 0.5) idx = i;
      }

      const visible = idx >= 0;
      if (visible !== lastVisible) {
        lastVisible = visible;
        if (barRef.current) barRef.current.dataset.visible = visible ? '1' : '0';
      }
      if (!visible) return;

      if (atBottom) {
        if (!closedShown) {
          closedShown = true;
          if (textRef.current) textRef.current.textContent = chatBar.closingLine;
        }
        setStatus('done', `session closed · ${lines.length} turns`);
        return;
      }
      closedShown = false;

      if (idx !== curIdx) {
        curIdx = idx;
        lineStart = now;
        lastCharCount = -1;
      }

      const line = lines[curIdx];
      const elapsed = now - lineStart;
      const charCount = Math.max(0, Math.min(line.text.length, Math.floor(elapsed / MS_PER_CHAR)));
      const done = charCount >= line.text.length;

      if (charCount !== lastCharCount) {
        lastCharCount = charCount;
        if (textRef.current) textRef.current.textContent = line.text.slice(0, charCount);
      }
      setStatus(done ? 'done' : 'active', `turn ${curIdx + 1}/${lines.length}`);
    };

    // A continuous rAF loop, not a scroll-event listener — the typewriter
    // needs to keep advancing even while the user has stopped scrolling
    // mid-line, same reasoning as usePipelineScroll's own continuous loop.
    let raf = 0;
    const loop = (now: number) => {
      update(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef, barRef, textRef, statusDotRef, statusTextRef, enabled]);
}
