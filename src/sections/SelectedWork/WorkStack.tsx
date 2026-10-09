import { useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { MagnetLink } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import type { CaseStudySummary } from '../../content/caseStudies';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { saveScrollForReturn } from '../../hooks/useScrollRestoration';
import styles from './WorkStack.module.css';

const MAX_SPREAD = 340;
/** Mirrors `.card`'s width in WorkStack.module.css (min(88vw, 34rem)) — needed to size the fan so the outer cards stay inside the viewport. */
const CARD_MAX_W = 544;
const VIEWPORT_MARGIN = 64;
const ROTATE_STEP = 7;
const LIFT = 40;

function inRange(i: number, length: number) {
  return Math.min(Math.max(0, i), Math.max(0, length - 1));
}

interface WorkStackProps {
  cases: CaseStudySummary[];
  cursor: CursorTracker;
}

/**
 * Second animation prototype for "Избранные кейсы" (2026-09-23, per user
 * request — reference: a hover-fan card-stack component, ported from its
 * original Tailwind/framer-motion source to this site's CSS-Modules +
 * plain-CSS-transition convention, no new dependency added). Resting: a
 * tight overlapping stack. Hover/focus the stage: cards fan out, the
 * hovered one lifts to the front. No portrait image per the user's
 * follow-up — each card is label/title/2-line description text only.
 *
 * 2026-09-23 revision: cards enlarged; the circular corner button replaced
 * with the site's own footer-link row (MagnetLink "Открыть кейс →" + every
 * `cs.links` entry — github/prototype/PRD etc., same as the plain list's
 * cards) so per-case links aren't lost in this layout. The whole card is no
 * longer itself an `<a>` (footer links need to be independently clickable,
 * an `<a>`-in-`<a>` isn't valid) — same overlay-link pattern the plain list
 * already uses: a full-cover RouterLink under the visible footer links.
 */
export function WorkStack({ cases, cursor }: WorkStackProps) {
  const reducedMotion = useReducedMotion();
  const windowWidth = useWindowWidth();
  const cardW = Math.min(windowWidth * 0.88, CARD_MAX_W);
  const spread = Math.min(MAX_SPREAD, Math.max(120, (windowWidth - cardW - VIEWPORT_MARGIN) / Math.max(1, cases.length - 1)));
  const restingIndex = Math.floor((cases.length - 1) / 2);
  const [activeIndex, setActiveIndex] = useState(restingIndex);
  const [open, setOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const midpoint = (cases.length - 1) / 2;

  const layouts = useMemo(
    () =>
      cases.map((_, i) => {
        const orbit = i - midpoint;
        const stack = i - restingIndex;
        return {
          open: { x: orbit * spread, y: Math.abs(orbit) * 30, rotation: orbit * ROTATE_STEP },
          closed: { x: stack * 12, y: Math.abs(stack) * 6, rotation: stack * 2.6 },
        };
      }),
    [cases, midpoint, restingIndex, spread],
  );

  const activate = (i: number) => {
    setOpen(true);
    setActiveIndex(inRange(i, cases.length));
  };
  const close = () => {
    setOpen(false);
    setActiveIndex(restingIndex);
  };
  const onBlurStage = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (i + 1) % cases.length;
      activate(next);
      stageRef.current?.querySelectorAll<HTMLElement>('[role="listitem"]')[next]?.focus();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (i - 1 + cases.length) % cases.length;
      activate(next);
      stageRef.current?.querySelectorAll<HTMLElement>('[role="listitem"]')[next]?.focus();
    }
    if (e.key === 'Escape') {
      (e.target as HTMLElement).blur();
      close();
    }
  };

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      onMouseLeave={close}
      onBlur={onBlurStage}
      role="list"
      aria-label="Избранные кейсы"
    >
      {cases.map((cs, i) => {
        const pos = open ? layouts[i].open : layouts[i].closed;
        const active = i === activeIndex;
        const style: CSSProperties = {
          zIndex: active ? 80 : 50 - Math.abs(i - activeIndex),
          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y - (open && active ? LIFT : 0)}px)) rotate(${pos.rotation}deg) scale(${open ? 0.99 : 0.97})`,
          transitionDuration: reducedMotion ? '0ms' : '420ms',
        };
        return (
          <article
            key={cs.id}
            role="listitem"
            tabIndex={0}
            aria-current={active ? 'true' : undefined}
            className={styles.card}
            style={style}
            data-noasm="1"
            onMouseEnter={() => activate(i)}
            onFocus={() => activate(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <RouterLink
              to={`/work/${cs.id}`}
              aria-label={cs.title}
              className={styles.cardOverlayLink}
              onClick={saveScrollForReturn}
            />
            {/* Corner brackets — same "inspector selection box" treatment as the site's own Card component (Card.module.css), ported in rather than reused directly since CSS Modules classes don't cross files. */}
            <span className={`${styles.corner} ${styles.cornerTopLeft}`} aria-hidden="true" />
            <span className={`${styles.corner} ${styles.cornerTopRight}`} aria-hidden="true" />
            <span className={`${styles.corner} ${styles.cornerBottomLeft}`} aria-hidden="true" />
            <span className={`${styles.corner} ${styles.cornerBottomRight}`} aria-hidden="true" />
            <p className={styles.cardType}>{cs.type}</p>
            <h3 className={styles.cardName}>{cs.title.split(' — ')[0]}</h3>
            <p className={styles.cardDesc}>{cs.blocks[0].text}</p>

            <div className={styles.cardFooter}>
              <div className={styles.cardLinks}>
                <MagnetLink
                  href={`/work/${cs.id}`}
                  variant="accent"
                  reducedMotion={reducedMotion}
                  onMouseEnter={cursor.onEnter}
                  onMouseLeave={cursor.onLeave}
                  onClick={saveScrollForReturn}
                >
                  Открыть кейс →
                </MagnetLink>
                {cs.links.map((l) => (
                  <MagnetLink
                    key={l.url}
                    href={l.url}
                    variant="underline"
                    external
                    reducedMotion={reducedMotion}
                    onMouseEnter={cursor.onEnter}
                    onMouseLeave={cursor.onLeave}
                  >
                    {l.label} ↗
                  </MagnetLink>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
