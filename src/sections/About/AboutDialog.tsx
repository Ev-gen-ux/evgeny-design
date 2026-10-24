import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { AboutQA } from '../../content/about';
import styles from './AboutDialog.module.css';

interface AboutDialogProps {
  items: readonly AboutQA[];
  reducedMotion: boolean;
}

/** How long one question stays on screen: the underline of its tab fills over this time (a progress bar), then the next one starts. */
/** How long one question stays on screen: the underline of its tab fills over this time (a progress bar), then the next one starts. */
const AUTO_MS = 7000;
const LEAD_MS = 50;
const Q_STEP = 10;
const A_STEP = 3;
const N_STEP = 3;
/** The tabs assemble once, on entry, after the first exchange: a fixed time (not tied to the current answer, so a tab switch never restarts them). */
/** Tabs assemble right after the slide-0 note (the one visible on entry) has finished. */
const TABS_DELAY_MS = 1050;
const TAB_STEP = 45;
const TAB_LETTER_STEP = 5;
/** The track and the fill appear last, after the tab text has assembled. */
const LINE_DELAY_MS = TABS_DELAY_MS + 750;

function jitter(a: number, b: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

/** Letters that fly in from scattered positions (the same effect as the site's own text assembly). Words stay unbreakable. */
function Scatter({ text, start, step, seed }: { text: string; start: number; step: number; seed: string }) {
  let n = 0;
  return (
    <>
      {text.split(' ').map((w, wi) => (
        <Fragment key={`${seed}-w${wi}`}>
          <span className={styles.wordBox}>
            {Array.from(w).map((ch) => {
              const idx = n++;
              return (
                <span
                  key={`${seed}-${idx}`}
                  className={styles.letter}
                  style={
                    {
                      '--dx': `${(jitter(idx, wi + 3) * 150).toFixed(0)}px`,
                      '--dy': `${(jitter(wi + 5, idx) * 100).toFixed(0)}px`,
                      '--r': `${(jitter(idx + 9, wi) * 50).toFixed(0)}deg`,
                      animationDelay: `${start + idx * step}ms`,
                    } as CSSProperties
                  }
                >
                  {ch}
                </span>
              );
            })}
          </span>{' '}
        </Fragment>
      ))}
    </>
  );
}

/**
 * «Dialog» variant of the About block (2026-09-26, chosen by the user from the research proposals): the block
 * literally is the site's `you / agent` metaphor. The WHOLE block assembles when it is scrolled to, with the same
 * letters-fly-in effect as the rest of the site: `you`, the question, `agent`, the answer, then the tabs, and last
 * the track under the active tab appears; nothing of it is visible before that, and it all resets after the block
 * has left the screen. A tab switch re-assembles the question and the answer. The controls are text tabs (mono
 * text, an accent underline that slides to the active one) — the site's buttons are text/links, not badges.
 * The underline is a progress bar: it fills the width of the active tab over ~9s and, when full, the next question
 * starts (the switch is driven by the end of that CSS animation, so pausing it pauses the dialog). Hover or keyboard
 * focus inside the block and being off screen pause it; a click on a tab switches at once and restarts the bar there.
 */
export function AboutDialog({ items, reducedMotion }: AboutDialogProps) {
  const [active, setActive] = useState(0);
  const [switches, setSwitches] = useState(0);
  const [enter, setEnter] = useState(0);
  const [started, setStarted] = useState(reducedMotion);
  const [ind, setInd] = useState({ x: 0, w: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabsMounted = useRef(false);
  const startedRef = useRef(reducedMotion);
  // True from the block's entry until the first switch: the first bar starts after the tabs have assembled.
  const [fresh, setFresh] = useState(true);

  useEffect(() => {
    if (reducedMotion) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.4 && !startedRef.current) {
          startedRef.current = true;
          setEnter((n) => n + 1);
          setFresh(true);
          setStarted(true);
        } else if (!entry.isIntersecting && startedRef.current) {
          startedRef.current = false;
          setStarted(false);
        }
      },
      { threshold: [0, 0.4] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const measure = () => {
      const tab = tabRefs.current[active];
      if (tab) setInd({ x: tab.offsetLeft, w: tab.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active]);

  // Phone (2026-10-09): `.tabs` scrolls horizontally there (see .module.css) —
  // keep the active tab in view on every switch, auto-advance included, not
  // just a manual click. No-op on desktop, where all tabs already fit.
  //
  // Skip the very first run (2026-10-10, site loading scrolled straight to
  // "О себе" instead of the hero, on every device): `block: 'nearest'` only
  // cares whether the tab is vertically in the viewport, not just whether the
  // tabs row itself needs horizontal scrolling — on initial mount, before the
  // page has scrolled anywhere, this section is still below the fold, so it
  // counted as "not visible" and pulled the whole page down to it. There's
  // nothing to keep in view yet on mount; this effect only matters once the
  // user has actually switched tabs.
  useEffect(() => {
    if (!tabsMounted.current) {
      tabsMounted.current = true;
      return;
    }
    tabRefs.current[active]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  const pick = (i: number) => {
    if (i === active) return;
    setFresh(false);
    setActive(i);
    setSwitches((s) => s + 1);
  };

  const advance = () => {
    setFresh(false);
    setActive((a) => (a + 1) % items.length);
    setSwitches((s) => s + 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (active + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    pick(next);
    tabRefs.current[next]?.focus();
  };

  const current = items[active];
  const questionEnd = LEAD_MS + current.question.length * Q_STEP;
  const answerStart = questionEnd + 60;
  const noteStart = answerStart + current.answer.length * A_STEP + 40;
  const key = `${enter}-${switches}`;

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${started ? '' : styles.hidden}`}
    >
      <div className={styles.exchange} data-noasm="1" aria-live="polite">
        <p className={styles.line}>
          <span className={styles.question}>
            {reducedMotion ? (
              current.question
            ) : (
              <>
                <span className={styles.sr}>{current.question}</span>
                <span aria-hidden="true">
                  <Scatter text={current.question} start={LEAD_MS} step={Q_STEP} seed={`q-${key}`} />
                </span>
              </>
            )}
          </span>
        </p>
        <p className={styles.line}>
          <span className={styles.answerCol}>
            <span className={styles.answer}>
              {reducedMotion ? (
                current.answer
              ) : (
                <>
                  <span className={styles.sr}>{current.answer}</span>
                  <span aria-hidden="true">
                    <Scatter text={current.answer} start={answerStart} step={A_STEP} seed={`a-${key}`} />
                  </span>
                </>
              )}
            </span>
            <span className={styles.note}>
              {reducedMotion ? (
                current.note
              ) : (
                <>
                  <span className={styles.sr}>{current.note}</span>
                  <span aria-hidden="true">
                    <Scatter text={current.note} start={noteStart} step={N_STEP} seed={`n-${key}`} />
                  </span>
                </>
              )}
            </span>
          </span>
        </p>
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Вопросы" onKeyDown={onKeyDown} data-noasm="1">
        {items.map((it, i) => (
          <button
            key={it.question}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={it.question}
            tabIndex={i === active ? 0 : -1}
            className={`${styles.tab} ${i === active ? styles.tabOn : ''}`}
            onClick={() => pick(i)}
          >
            {reducedMotion ? (
              it.question
            ) : (
              <span aria-hidden="true">
                <Scatter text={it.question} start={TABS_DELAY_MS + i * TAB_STEP} step={TAB_LETTER_STEP} seed={`t${i}-${enter}`} />
              </span>
            )}
          </button>
        ))}
        <span className={styles.indicator} style={{ width: ind.w, transform: `translateX(${ind.x}px)` }} aria-hidden="true">
          {reducedMotion ? (
            <i className={styles.fillStatic} />
          ) : (
            <span key={`track-${enter}`} className={styles.track} style={{ animationDelay: `${LINE_DELAY_MS}ms` }}>
              <i
                key={`fill-${enter}-${switches}`}
                className={styles.fill}
                style={{ animationDuration: `${AUTO_MS}ms`, animationDelay: `${fresh ? LINE_DELAY_MS + 100 : 0}ms` }}
                onAnimationEnd={advance}
              />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
