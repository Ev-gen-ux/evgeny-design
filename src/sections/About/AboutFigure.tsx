import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { AboutSlide } from '../../content/about';
import { figureSync } from '../../hooks/figureSync';
import styles from './AboutFigure.module.css';

interface AboutFigureProps {
  slides: readonly AboutSlide[];
}

/** Which band of the figure (0 = top) each statement points to; top-to-bottom order keeps the lines from crossing. */
const BANDS = [0, 1, 3, 4];
/**
 * Each line runs right to a free lane past all the text, drops down to the height of its point and enters it
 * horizontally. Lower statements take the inner lanes and upper ones the outer, so the lines never cross.
 */
const GUTTER = 14;
const LANE = 10;
const ENTRY = 12;

/**
 * «Figure as an outline» variant of the About block (2026-09-26, the saved backup idea; desktop only): the
 * statements stand in a column and each is connected by a thin leader line, like a dimension line in a design
 * tool, to its own band of the hero figure (which stays fixed and drifts while the page scrolls, so the lines are
 * recomputed every frame). Hovering a statement lights its band. Lines are drawn in a portal on <body>, because the
 * section has a transform (scroll reveal) that would break `position: fixed`.
 */
export function AboutFigure({ slides }: AboutFigureProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const hovered = useRef(-1);

  useEffect(() => {
    let raf = 0;
    let running = false;
    const draw = () => {
      const root = rootRef.current;
      const svg = svgRef.current;
      if (root && svg) {
        const vh = window.innerHeight;
        const r = root.getBoundingClientRect();
        const shown = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        // Fades in as the block enters the viewport and out as it leaves.
        svg.style.opacity = String(Math.max(0, Math.min(1, shown / (r.height * 0.7))));
        let textRight = 0;
        itemRefs.current.forEach((el) => {
          if (el) textRight = Math.max(textRight, el.getBoundingClientRect().right);
        });
        slides.forEach((_, i) => {
          const title = titleRefs.current[i];
          const path = pathRefs.current[i];
          const dot = dotRefs.current[i];
          const a = figureSync.anchors[BANDS[i]];
          if (!title || !path || !dot || !a || !Number.isFinite(a.x)) return;
          const tr = title.getBoundingClientRect();
          const x1 = tr.right + 14;
          const y1 = tr.top + tr.height / 2;
          const lane = Math.min(Math.max(textRight, x1) + GUTTER + (slides.length - 1 - i) * LANE, a.x - ENTRY);
          path.setAttribute('d', `M ${x1.toFixed(1)} ${y1.toFixed(1)} H ${lane.toFixed(1)} V ${a.y.toFixed(1)} H ${a.x.toFixed(1)}`);
          dot.setAttribute('cx', a.x.toFixed(1));
          dot.setAttribute('cy', a.y.toFixed(1));
          const on = hovered.current === i;
          path.classList.toggle(styles.lineOn, on);
          dot.classList.toggle(styles.dotOn, on);
        });
      }
      if (running) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting;
      figureSync.active = visible;
      if (visible && !running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
      if (!visible) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    if (rootRef.current) io.observe(rootRef.current);
    return () => {
      io.disconnect();
      running = false;
      cancelAnimationFrame(raf);
      figureSync.active = false;
      figureSync.highlight = -1;
    };
  }, [slides]);

  return (
    <div ref={rootRef} className={styles.root}>
      <ul className={styles.list}>
        {slides.map((s, i) => (
          <li
            key={s.title}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={styles.item}
            onMouseEnter={() => {
              hovered.current = i;
              figureSync.highlight = BANDS[i];
            }}
            onMouseLeave={() => {
              hovered.current = -1;
              figureSync.highlight = -1;
            }}
          >
            <span
              className={styles.title}
              ref={(el) => {
                titleRefs.current[i] = el;
              }}
            >
              {s.title}
            </span>
            <p className={styles.text}>{s.text}</p>
          </li>
        ))}
      </ul>
      {createPortal(
        <svg ref={svgRef} className={styles.overlay} aria-hidden="true">
          {slides.map((s, i) => (
            <g key={s.title}>
              <path
                className={styles.line}
                ref={(el) => {
                  pathRefs.current[i] = el;
                }}
              />
              <circle
                className={styles.dot}
                r="3.5"
                ref={(el) => {
                  dotRefs.current[i] = el;
                }}
              />
            </g>
          ))}
        </svg>,
        document.body,
      )}
    </div>
  );
}
