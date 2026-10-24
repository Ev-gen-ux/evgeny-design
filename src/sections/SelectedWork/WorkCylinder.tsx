import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { MagnetLink, Tag } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import type { CaseStudySummary } from '../../content/caseStudies';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWorkWheelScroll } from '../../hooks/useWorkWheelScroll';
import { saveScrollForReturn } from '../../hooks/useScrollRestoration';
import { createCardAssembly, type CardAssembly } from './cardAssembly';
import styles from './WorkCylinder.module.css';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Card text assembling (after landing) / breaking apart (on leaving). */
const ASSEMBLE_MS = 1150;
const DISASSEMBLE_MS = 450;

const D = 1350;
const GAP = 36;
const PEEK = -55;
const CARD_W = 440;
const CARD_H = 300;

/** Position of one card on the vertical cylinder for a given signed offset from the active index (math ported from the reference carousel, smoothstepped segments 0→1→2→3). */
function place(offset: number, h: number) {
  const abs = Math.abs(offset);
  const sign = Math.sign(offset);
  let y: number;
  let z: number;
  let rot: number;
  if (abs <= 1) {
    const e = abs * abs * (3 - 2 * abs);
    y = -sign * e * (CARD_H + GAP);
    z = 400 + e * (220 - 400);
    rot = e * 132;
  } else if (abs <= 2) {
    const t = abs - 1;
    const e = t * t * (3 - 2 * t);
    const zEnd = -60;
    const yEnd = (h / 2 - PEEK) / (D / (D - zEnd)) - CARD_H / 2;
    const yStart = CARD_H + GAP;
    y = -sign * (yStart + e * (yEnd - yStart));
    z = 220 + e * (zEnd - 220);
    rot = 132 + e * (175 - 132);
  } else {
    const t = Math.min(abs - 2, 1);
    const e = t * t * (3 - 2 * t);
    const zStart = -60;
    const zEnd = -250;
    const yEnd2 = (h / 2 - PEEK) / (D / (D - zStart)) - CARD_H / 2;
    const yEnd3 = (h / 2 + 100) / (D / (D - zEnd)) + CARD_H / 2;
    y = -sign * (yEnd2 + e * (yEnd3 - yEnd2));
    z = zStart + e * (zEnd - zStart);
    rot = 175 + e * (195 - 175);
  }
  return { y, z, rot, sign, abs };
}

interface WorkCylinderProps {
  cases: CaseStudySummary[];
  cursor: CursorTracker;
}

/**
 * Third prototype for "Избранные кейсы" (2026-09-26, per user request —
 * reference: a 3D vertical cylinder card carousel). Differences from the
 * reference, on purpose: scroll-driven instead of autoplaying (pinned section,
 * same `useWorkWheelScroll` engine as the wheel prototype), text/links on the
 * face instead of video/logos, and only the card at the center is clickable —
 * off-center cards are tilted/backfacing, so they're `pointer-events:none`;
 * focusing one by keyboard scrolls the section to it. Kept from the
 * reference: the magnetic dwell easing, the perspective/rotation curve, the
 * inertia-damped mouse tilt on the center card.
 */
export function WorkCylinder({ cases, cursor }: WorkCylinderProps) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const assemblies = useRef<(CardAssembly | null)[]>([]);
  // Per-card assembly progress 0..1 and the moment of the last frame — the assembly is time-based, see onFrame.
  const assemble = useRef<{ v: number[]; want: boolean[]; last: number; dir: number; lastT: number | null }>({ v: [], want: [], last: 0, dir: 1, lastT: null });

  // Scroll-jank fix (2026-10-24): useWorkWheelScroll's rAF loop used to run
  // unconditionally (enabled=true below) for the entire time this component
  // was mounted, doing forced-layout reads (docTop/offsetHeight/
  // getBoundingClientRect) every single frame even while the section was
  // nowhere near the viewport. Gated behind an IntersectionObserver —
  // generous rootMargin so the loop is already warm by the time the section
  // reaches the viewport, instead of starting cold.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '40% 0px' });
    observer.observe(sec);
    return () => observer.disconnect();
  }, []);

  // Declared before useWorkWheelScroll so its rAF loop never runs a frame without these handles.
  useEffect(() => {
    assemblies.current = cardRefs.current.map((el, i) => (el ? createCardAssembly(el, cases[i].id) : null));
    return () => {
      assemblies.current.forEach((a) => a?.dispose());
      assemblies.current = [];
    };
  }, [cases]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.tx = Math.max(-1, Math.min(1, (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)));
      mouse.current.ty = Math.max(-1, Math.min(1, (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)));
    };
    const onLeave = () => {
      mouse.current.tx = 0;
      mouse.current.ty = 0;
    };
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const onFrame = useCallback((t: number) => {
    const m = mouse.current;
    m.x += (m.tx - m.x) * 0.08;
    m.y += (m.ty - m.y) * 0.08;

    const h = window.innerHeight;
    const now = performance.now();
    const dt = Math.min(64, now - (assemble.current.last || now));
    assemble.current.last = now;
    const secRect = sectionRef.current?.getBoundingClientRect();
    // Section not reached yet / scrolled back above it. The card's centre reaches the middle of the viewport when the pin's top edge is at ~0.3h (card ~40px under the edge, ~460px tall): the text starts assembling right then.
    const above = !secRect || secRect.top >= h * 0.3;
    // Vertical rest position of the card (2026-09-26, per user request): the heading scrolls away normally. Until the card reaches the middle of the viewport it travels with the page (its natural spot is 40px under the pin's top edge = 100px under the heading); from there it holds at the centre while the pin engages, then leaves with the cards. Only a transform is written per frame (no layout): the highest corner of the resting card sits at h/2 - 230.
    if (secRect && sceneRef.current) {
      const stickyTop = Math.max(0, secRect.top);
      const dy = Math.max(0, h / 2 - 230 - (stickyTop + 40));
      sceneRef.current.style.transform = `translateY(${dy.toFixed(1)}px)`;
    }
    const stt = assemble.current;
    if (stt.lastT === null) stt.lastT = t;
    else if (Math.abs(t - stt.lastT) > 0.0005) {
      stt.dir = t > stt.lastT ? 1 : -1;
      stt.lastT = t;
    }
    const rounded = Math.round(t);
    const diff = t - rounded;
    // Magnetic dwell: nearly still around each integer index, accelerating between.
    const virtual = rounded + (Math.sign(diff) * Math.pow(Math.abs(diff) * 2, 4.2)) / 2;

    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      // Scroll down = next card rises from below, hence virtual - i (not i - virtual).
      const { y, z, rot, sign, abs } = place(virtual - i, h);
      // Assembly is TIME-based and directional (2026-09-26, per user):
      //  • scrolling DOWN: a card assembles once it has almost LANDED (abs < 0.15,
      //    i.e. visually in place, ~0.15 of the travel left) — nothing of its text is visible before that;
      //    a card that has been passed stays assembled while it flies away;
      //  • scrolling UP: the card you leave breaks apart as soon as you move up
      //    from its center, and the previous card arrives already assembled;
      //  • above the section: everything breaks apart (the intro replays on return).
      // Direction comes from the sign of the smoothed t (with a small deadband).
      const st = assemble.current;
      let want = st.want[i] ?? false;
      if (above) want = false;
      else if (st.dir > 0) {
        if (abs < 0.15) want = true;
        else if (t < i) want = false;
      } else if (t > i) want = true;
      else if (t < i - 0.05) want = false;
      st.want[i] = want;
      st.v[i] = clamp01((st.v[i] ?? 0) + (want ? dt / ASSEMBLE_MS : -dt / DISASSEMBLE_MS));
      assemblies.current[i]?.update(Math.round(st.v[i] * 400) / 400);
      if (abs > 3) {
        el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = 'visible';
      const centerFactor = Math.max(0, 1 - abs);
      const tiltX = -m.y * 12 * centerFactor;
      const tiltY = m.x * 15 * centerFactor;
      el.style.zIndex = Math.round(z).toString();
      el.style.transform = `translateY(${y.toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${(-sign * rot + tiltX).toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) rotateZ(-3deg)`;
      el.dataset.live = abs < 0.12 ? 'true' : 'false';
    });
  }, []);

  useWorkWheelScroll(sectionRef, cases.length, onFrame, inView);

  const scrollToCard = (i: number) => {
    const sec = sectionRef.current;
    const el = cardRefs.current[i];
    if (!sec || !el || el.dataset.live === 'true') return;
    const top = sec.getBoundingClientRect().top + window.scrollY;
    const scrollable = sec.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (i / Math.max(1, cases.length - 1)) * scrollable });
  };

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      style={{ height: `${cases.length * 100}vh` }}
      data-noasm="1"
      aria-label="Избранные кейсы"
    >
      <div className={styles.sticky}>
        <div ref={sceneRef} className={styles.scene}>
          <div className={styles.rig} style={{ width: CARD_W, height: CARD_H }}>
            {cases.map((cs, i) => (
              <article
                key={cs.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={styles.card}
                style={{ width: CARD_W, height: CARD_H, visibility: 'hidden' }}
                data-live={i === 0 ? 'true' : 'false'}
                onFocus={() => scrollToCard(i)}
              >
                <div className={styles.slab} />

                <div className={`${styles.face} ${styles.front}`}>
                  <RouterLink
                    to={`/work/${cs.id}`}
                    aria-label={cs.title}
                    className={styles.overlayLink}
                    onClick={saveScrollForReturn}
                  />
                  <span className={`${styles.corner} ${styles.cornerTopLeft}`} aria-hidden="true" />
                  <span className={`${styles.corner} ${styles.cornerTopRight}`} aria-hidden="true" />
                  <span className={`${styles.corner} ${styles.cornerBottomLeft}`} aria-hidden="true" />
                  <span className={`${styles.corner} ${styles.cornerBottomRight}`} aria-hidden="true" />
                  <div className={styles.top}>
                    <div className={styles.tagGroup}>
                      <span data-ag="0" data-ak="b">
                        <Tag tone="accent" className={styles.tag}>
                          {cs.tag}
                        </Tag>
                      </span>
                      {cs.extraTags?.map((t) => (
                        <span key={t} data-ag="0" data-ak="b">
                          <Tag tone="accent" className={styles.tag}>
                            {t}
                          </Tag>
                        </span>
                      ))}
                    </div>
                    <span className={styles.type} data-ag="0" data-ak="b">
                      {cs.type}
                    </span>
                  </div>
                  <h3 className={styles.name} data-ag="1" data-ak="l">
                    {cs.title.split(' — ')[0]}
                  </h3>
                  <div className={styles.facts}>
                    <div className={styles.metrics}>
                      {cs.metrics.map((m) => (
                        <div key={m.label} data-ag="2" data-ak="b">
                          <div className={styles.metricLabel}>{m.label}</div>
                          <div className={styles.metricValue}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className={styles.teaser} data-ag="3" data-ak="w">
                    {cs.teaser}
                  </p>
                  <div className={styles.footer}>
                    <span data-ag="4" data-ak="b">
                      <MagnetLink
                        href={`/work/${cs.id}`}
                        variant="underline"
                        reducedMotion={reducedMotion}
                        onMouseEnter={cursor.onEnter}
                        onMouseLeave={cursor.onLeave}
                        onClick={saveScrollForReturn}
                      >
                        open case →
                      </MagnetLink>
                    </span>
                    {cs.links.map((l) => (
                      <span key={l.url} data-ag="4" data-ak="b">
                        <MagnetLink
                          href={l.url}
                          variant="underline"
                          external
                          reducedMotion={reducedMotion}
                          onMouseEnter={cursor.onEnter}
                          onMouseLeave={cursor.onLeave}
                        >
                          {l.label} ↗
                        </MagnetLink>
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`${styles.face} ${styles.back}`} aria-hidden="true">
                  <span className={styles.backIndex}>
                    0{i + 1} / 0{cases.length}
                  </span>
                  <span className={styles.backTag}>{cs.tag}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
