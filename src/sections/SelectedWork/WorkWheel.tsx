import { useCallback, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { CaseStudySummary } from '../../content/caseStudies';
import { useWorkWheelScroll } from '../../hooks/useWorkWheelScroll';
import { saveScrollForReturn } from '../../hooks/useScrollRestoration';
import styles from './WorkWheel.module.css';

const STEP_ANGLE = 15;
const RADIUS = 620;

interface WorkWheelProps {
  cases: CaseStudySummary[];
}

/**
 * Prototype (2026-09-23, per user request) — scroll-pinned radial label
 * fan, one case legible at a time, swapping as the user scrolls through the
 * section. Not wired into prod; see SelectedWork.tsx for the width/reduced-
 * motion gate that falls back to the plain card list.
 *
 * Arc math: a real circle. Each label sits at `rotate(theta) translateX(R)`
 * from a shared off-screen hub anchor, theta = (index - t) * STEP_ANGLE — so
 * the active label (theta≈0) lands unrotated at the hub's `translateX(R)`
 * point, and every other label sits further along the circle's rim, rotated
 * to match the tangent, curving away exactly like the reference screenshot.
 */
export function WorkWheel({ cases }: WorkWheelProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const lastActive = useRef(0);

  const onFrame = useCallback((t: number) => {
    const items = itemRefs.current;
    const dots = dotRefs.current;
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      if (!el) continue;
      const theta = (i - t) * STEP_ANGLE;
      const dist = Math.abs(i - t);
      const opacity = Math.max(0.2, 1 - dist * 0.4);
      el.style.transform = `rotate(${theta.toFixed(2)}deg) translateX(${RADIUS}px)`;
      el.style.opacity = opacity.toFixed(3);
      el.dataset.active = dist < 0.5 ? 'true' : 'false';
      const dot = dots[i];
      if (dot) dot.style.opacity = Math.max(0, 1 - dist * 2).toFixed(3);
    }
    const rounded = Math.max(0, Math.min(items.length - 1, Math.round(t)));
    if (rounded !== lastActive.current) {
      lastActive.current = rounded;
      setActive(rounded);
    }
  }, []);

  useWorkWheelScroll(sectionRef, cases.length, onFrame, true);

  const activeCase = cases[active];

  return (
    <section ref={sectionRef} className={styles.section} style={{ height: `${cases.length * 100}vh` }}>
      <div className={styles.sticky}>
        <div className={styles.frame}>
          <RouterLink
            to={`/work/${activeCase.id}`}
            className={styles.imagePanel}
            onClick={saveScrollForReturn}
            aria-label={activeCase.title}
            // index/title swap on scroll (React-driven text, not a static
            // reveal) — the global letter-scatter engine splits text once on
            // mount and fights React over the DOM node on every update,
            // freezing it on whatever text was there first. Same documented
            // escape hatch used elsewhere for dynamic text (see CaseStudy.tsx).
            data-noasm="1"
          >
            <div className={styles.imageGradient} />
            <span className={styles.imageIndex}>0{active + 1}</span>
            <span className={styles.imageTitle}>{activeCase.title}</span>
          </RouterLink>

          <div className={styles.wheel}>
            <div ref={hubRef} className={styles.hub}>
              {cases.map((cs, i) => (
                <RouterLink
                  key={cs.id}
                  to={`/work/${cs.id}`}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  className={styles.item}
                  onClick={saveScrollForReturn}
                >
                  <span
                    ref={(el) => {
                      dotRefs.current[i] = el;
                    }}
                    className={styles.itemDot}
                  />
                  {cs.title.split(' — ')[0]}
                </RouterLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
