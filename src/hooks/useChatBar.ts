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

    // Re-measure on layout shift (2026-09-18) — cheap defense against real
    // page-height drift (webfonts, any width-dependent section height)
    // between mount and later frames.
    const remeasure = () => {
      for (let i = 0; i < lineEls.length; i++) lines[i].top = docTop(lineEls[i]);
    };
    const resizeObserver = new ResizeObserver(remeasure);
    resizeObserver.observe(document.body);
    const t1 = window.setTimeout(remeasure, 300);
    const t2 = window.setTimeout(remeasure, 1200);

    // Root cause of the original "bar renders correctly by every CSS
    // measure but is invisible on screen" bug (2026-09-18): mobile browsers
    // report `window.innerHeight` against the LARGE/static viewport (as if
    // the address bar/toolbar were already hidden) while `visualViewport`
    // tracks the ACTUALLY visible one, so `bottom: 0` (which CSS resolves
    // against the large viewport) could sit up to ~60px below the real
    // bottom of the screen.
    //
    // First fix compared `window.innerHeight` against `visualViewport` every
    // frame and wrote the gap as a `bottom` offset — worked, but reported as
    // a new bug the same day: scrolling to the true bottom then back up made
    // the bar visibly jump up and hold for half a second before settling.
    // Root cause of THAT: `window.innerHeight` and `visualViewport.height`
    // are two independently-updating numbers, and the mobile browser's own
    // toolbar show/hide transition (triggered by scroll direction at the
    // page extremes) takes a moment to complete — during that moment the
    // two numbers disagree more than usual, and no amount of easing the
    // *comparison's output* fixes a comparison between two things that are
    // each individually still in motion (confirmed: an eased version of the
    // same `bottom`-offset approach didn't help at all).
    //
    // Real fix: stop comparing two independently-updating measurements at
    // all. `position: fixed; top: <value>px` — not `bottom` — computed
    // *purely* from `visualViewport.offsetTop + visualViewport.height`,
    // which are always self-consistent with each other (both come from the
    // same API, updating together) and never need to be checked against
    // `window.innerHeight` in the first place. `bottom` as a CSS property is
    // inherently measured against the large/layout viewport — there's no
    // way to express "flush with the visible viewport's bottom" using
    // `bottom` without reintroducing exactly the cross-viewport comparison
    // that caused the jump; `top` measured from the layout viewport's own
    // top sidesteps it entirely.
    const vv = window.visualViewport;
    const BAR_HEIGHT = 52; // matches `.bar`'s fixed CSS `height`, both breakpoints
    const syncBarPosition = () => {
      const bar = barRef.current;
      if (!bar) return;
      if (!vv) return;
      bar.style.bottom = 'auto';
      bar.style.top = `${(vv.offsetTop + vv.height - BAR_HEIGHT).toFixed(1)}px`;
    };

    let curIdx = -1;
    let lineStart = 0;
    let lastCharCount = -1;
    let lastVisible = false;
    let lastDotState = '';
    let lastStatusText = '';
    let closedShown = false;
    let lastFlipTime = 0;

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
      syncBarPosition();
      const vh = window.innerHeight;
      const sy = window.scrollY;
      const atBottom = sy + vh >= document.documentElement.scrollHeight - 4;

      let idx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (sy >= lines[i].top - vh * 0.5) idx = i;
      }

      // Debounce (2026-09-19, real-device report — a brief plain-color
      // flash right where the bar first appears, About's own boundary
      // specifically, screenshotted live: a caught frame with the flash
      // still on screen, ChatBar's own line not yet visible in it).
      // Lenis's own momentum-scroll deceleration can overshoot a target
      // position by a few pixels and then correct back, right as it
      // settles — if that correction straddles one of these `lines[i].top`
      // thresholds, `idx`/`visible` could flip forward then immediately
      // back within a couple of frames, each flip restarting `.bar`'s own
      // opacity transition (see ChatBar.module.css) from scratch — reading
      // as a flash instead of one clean fade-in. Holding the previously
      // committed `idx` for a short window after any change absorbs that
      // settle-jitter regardless of which direction it flickers, with no
      // perceptible lag on a normal, continuous scroll gesture (180ms is
      // well under how long any real scroll motion through this zone
      // takes).
      if (idx !== curIdx) {
        if (now - lastFlipTime < 180) {
          idx = curIdx;
        } else {
          lastFlipTime = now;
        }
      }

      // `curIdx` is committed here, unconditionally, every frame — not
      // only inside the `visible` branch further below. It used to only
      // update there, which was harmless on its own (nothing read a stale
      // `curIdx` while invisible), but combined with the debounce above it
      // became a real bug (2026-09-19, live report — scrolling back up
      // past About left the bar permanently stuck showing that line's
      // text instead of fading out): the debounce compares the freshly
      // computed `idx` against `curIdx` to detect a change, but if `curIdx`
      // only ever updates while `visible`, a transition INTO invisibility
      // (idx going to -1) never actually commits — next frame recomputes
      // idx as -1 again, sees it still differs from the stale, never-
      // updated `curIdx`, and (now within the 180ms debounce window from
      // its own first attempt) gets rejected right back to the old value.
      // That's a standing deadlock, not a one-off flicker: every frame
      // looks like a fresh "just changed, hold it" event forever, so the
      // bar can never finish leaving. Updating `curIdx` right here, before
      // the visibility branch, means a genuine transition to invisible
      // actually commits on the frame it's allowed through, so the next
      // frame's comparison correctly sees "no change" instead of
      // re-triggering the debounce indefinitely.
      const idxChanged = idx !== curIdx;
      curIdx = idx;
      if (idxChanged) {
        lineStart = now;
        lastCharCount = -1;
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
      resizeObserver.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef, barRef, textRef, statusDotRef, statusTextRef, enabled]);
}
