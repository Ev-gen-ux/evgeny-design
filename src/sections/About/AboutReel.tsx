import { useEffect, useRef, useState } from 'react';
import type { AboutSlide } from '../../content/about';
import styles from './AboutReel.module.css';

interface AboutReelProps {
  slides: readonly AboutSlide[];
  reducedMotion: boolean;
}

const INTERVAL_MS = 5200;

/** Deterministic -0.5..0.5 jitter for a letter's scatter offset. */
function jitter(a: number, b: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

/**
 * Carousel for the About block (2026-09-26, per user request): a vertical reel of phrases (one in focus in the
 * accent colour, neighbours dimmed, the rest hidden by a fade mask) and, under it, the short text of the slide in
 * focus. The phrase assembles letter by letter, the text word by word, like the rest of the site. Changes by
 * itself every ~5s (the text needs reading time), pauses on hover and while off screen, a click on a dimmed phrase
 * jumps to it; with reduced motion it is a plain static list. Not built on useAssemblyAnimation (which scans the
 * DOM once) — see `data-noasm`.
 */
export function AboutReel({ slides, reducedMotion }: AboutReelProps) {
  const n = slides.length;
  const [tick, setTick] = useState(0);
  const active = ((tick % n) + n) % n;
  const rootRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const visible = useRef(false);
  // Previous render's `active`, tracked via the "adjusting state during render" pattern
  // (react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes):
  // calling setState mid-render is fine and avoids both a ref read during render
  // (`react-hooks/refs`) and a setState-in-effect cascade (`react-hooks/set-state-in-effect`).
  // `d` is a pure function of (k, active), so the row offset for the previous render is
  // just the same formula applied to the previous `active` — no need to remember it per slide.
  const [seenActive, setSeenActive] = useState(active);
  const [prevActive, setPrevActive] = useState(active);
  if (seenActive !== active) {
    setSeenActive(active);
    setPrevActive(seenActive);
  }

  useEffect(() => {
    if (reducedMotion) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
    });
    io.observe(el);
    const id = window.setInterval(() => {
      if (!paused.current && visible.current && !document.hidden) setTick((t) => t + 1);
    }, INTERVAL_MS);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <div className={styles.staticList}>
        {slides.map((s) => (
          <p key={s.title} className={styles.staticItem}>
            <strong>{s.title}.</strong> {s.text}
          </p>
        ))}
      </div>
    );
  }

  const words = slides[active].text.split(' ');

  return (
    <div
      ref={rootRef}
      className={styles.root}
      role="group"
      aria-label="Чем занимаюсь"
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
    >
      <div className={styles.window} data-noasm="1" aria-hidden="true">
        {slides.map((s, k) => {
          const d = ((((k - active + n / 2) % n) + n) % n) - n / 2;
          // A phrase wrapping from the top to the bottom must not slide through the visible rows.
          // `d` is a pure function of (k, active), so the previous render's row offset for
          // this same slide is just the same formula applied to `prevActive` — no per-slide
          // bookkeeping needed (see prevActive above).
          const prevD = ((((k - prevActive + n / 2) % n) + n) % n) - n / 2;
          const jumped = active !== prevActive && Math.abs(d - prevD) > 1.5;
          const isActive = d === 0;
          const opacity = isActive ? 1 : Math.abs(d) === 1 ? 0.28 : 0;
          return (
            <span
              key={s.title}
              className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
              style={{
                transform: `translateY(${d * 1.35}em)`,
                opacity,
                transition: jumped ? 'none' : undefined,
                cursor: Math.abs(d) === 1 ? 'pointer' : undefined,
                pointerEvents: opacity === 0 ? 'none' : undefined,
              }}
              onClick={() => {
                if (Math.abs(d) === 1) setTick((t) => t + d);
              }}
            >
              {isActive
                ? Array.from(s.title).map((ch, i) => (
                    <span
                      key={`${tick}-${i}`}
                      className={styles.letter}
                      style={
                        {
                          '--dx': (jitter(tick, i) * 1.1).toFixed(2),
                          '--dy': (jitter(i, tick + 7) * 0.9).toFixed(2),
                          '--r': (jitter(i + 3, tick) * 40).toFixed(1),
                          animationDelay: `${i * 22}ms`,
                        } as React.CSSProperties
                      }
                    >
                      {ch}
                    </span>
                  ))
                : s.title}
            </span>
          );
        })}
      </div>
      <p className={styles.text} data-noasm="1" aria-hidden="true">
        {words.map((w, i) => (
          <span
            key={`${tick}-${i}`}
            className={styles.word}
            style={{ animationDelay: `${250 + i * 32}ms` } as React.CSSProperties}
          >
            {w}{' '}
          </span>
        ))}
      </p>
      <span className={styles.sr}>{slides.map((s) => `${s.title}. ${s.text}`).join(' ')}</span>
    </div>
  );
}
