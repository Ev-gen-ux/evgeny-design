import { runtimeTokens } from '../../tokens';
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
const ASSEMBLE_MS = runtimeTokens.workCylinder.assemblyMs;
const DISASSEMBLE_MS = runtimeTokens.workCylinder.disassemblyMs;

const D = runtimeTokens.workCylinder.perspective;
const GAP = runtimeTokens.workCylinder.gap;
const PEEK = runtimeTokens.workCylinder.peek;
const CARD_W = runtimeTokens.workCylinder.width;
const CARD_H = runtimeTokens.workCylinder.height;

/** Position of one card on the vertical cylinder for a given signed offset from the active index (math ported from the reference carousel, smoothstepped segments 0→1→2→3). */
function place(offset: number, h: number, cardHeight: number = CARD_H, neighborTravel: number = cardHeight + GAP) {
  const abs = Math.abs(offset);
  const sign = Math.sign(offset);
  let y: number;
  let z: number;
  let rot: number;
  if (abs <= 1) {
    const e = abs * abs * (3 - 2 * abs);
    y = -sign * e * neighborTravel;
    z = 400 + e * (220 - 400);
    rot = e * 132;
  } else if (abs <= 2) {
    const t = abs - 1;
    const e = t * t * (3 - 2 * t);
    const zEnd = -60;
    const yEnd = (h / 2 - PEEK) / (D / (D - zEnd)) - cardHeight / 2;
    const yStart = neighborTravel;
    y = -sign * (yStart + e * (yEnd - yStart));
    z = 220 + e * (zEnd - 220);
    rot = 132 + e * (175 - 132);
  } else {
    const t = Math.min(abs - 2, 1);
    const e = t * t * (3 - 2 * t);
    const zStart = -60;
    const zEnd = -250;
    const yEnd2 = (h / 2 - PEEK) / (D / (D - zStart)) - cardHeight / 2;
    const yEnd3 = (h / 2 + 100) / (D / (D - zEnd)) + cardHeight / 2;
    y = -sign * (yEnd2 + e * (yEnd3 - yEnd2));
    z = zStart + e * (zEnd - zStart);
    rot = 175 + e * (195 - 175);
  }
  return { y, z, rot, sign, abs };
}

/** Compress the visible phone gap after perspective, leaving the card size intact. */
function phoneNeighborTravel(cardHeight: number) {
  const half = cardHeight / 2;
  const angle = 132 * Math.PI / 180;
  const projection = D / (D - (220 - 400 + half * Math.sin(angle)));
  const travel = cardHeight + GAP;
  const visibleGap = Math.max(0, (travel + half * Math.cos(angle)) * projection - half);
  return travel - visibleGap * (1 - runtimeTokens.workCylinder.phoneNeighborGapRatio) / projection;
}

interface WorkCylinderProps {
  cases: CaseStudySummary[];
  cursor: CursorTracker;
  phone?: boolean;
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
export function WorkCylinder({ cases, cursor, phone = false }: WorkCylinderProps) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

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
    assemblies.current = cardRefs.current.map((el, i) => (el ? createCardAssembly(el, cases[i].id, phone) : null));
    return () => {
      assemblies.current.forEach((a) => a?.dispose());
      assemblies.current = [];
    };
  }, [cases, phone]);

  useEffect(() => {
    if (phone) return;
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
  }, [phone]);

  // Measure the actual mobile copy after wrapping, rather than shrinking desktop type.
  useEffect(() => {
    if (!phone) return;
    const section = sectionRef.current;
    if (!section) return;
    const cards = [...cardRefs.current];
    const faces = cards.flatMap((card) => {
      const face = card?.querySelector<HTMLElement>(`.${styles.content}`);
      return face ? [face] : [];
    });
    const footers = cards.flatMap((card) => {
      const footer = card?.querySelector<HTMLElement>(`.${styles.footer}`);
      return footer ? [footer] : [];
    });
    const measure = () => {
      const heights = faces.map((content, i) => {
        const face = content.parentElement!;
        const css = getComputedStyle(face);
        const gap = parseFloat(getComputedStyle(content).rowGap) || 0;
        const footerGap = footers[i] ? parseFloat(getComputedStyle(footers[i]).marginTop) || 0 : 0;
        return Math.ceil(content.offsetHeight + (footers[i]?.offsetHeight || 0) + gap + footerGap
          + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom)
          + parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth));
      });
      const height = Math.max(...heights, 0);
      if (height) {
        section.style.setProperty('--work-cylinder-phone-card-height', `${height}px`);
        cards.forEach((card) => card?.style.setProperty('--work-cylinder-phone-face-height', `${height}px`));
        section.style.setProperty('--work-cylinder-phone-exit-trim', '0px');
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    [...faces, ...footers].forEach((face) => observer.observe(face));
    return () => {
      observer.disconnect();
      section.style.removeProperty('--work-cylinder-phone-card-height');
      section.style.removeProperty('--work-cylinder-phone-exit-trim');
      cards.forEach((card) => card?.style.removeProperty('--work-cylinder-phone-face-height'));
    };
  }, [phone, cases]);

  const onFrame = useCallback((t: number) => {
    const m = mouse.current;
    m.x += (m.tx - m.x) * 0.08;
    m.y += (m.ty - m.y) * 0.08;

    const scene = sceneRef.current;
    const sticky = stickyRef.current;
    const h = phone ? window.innerHeight : (sticky?.clientHeight || window.innerHeight);
    const cardHeight = phone ? (sticky?.clientHeight || CARD_H) : CARD_H;
    if (phone && scene) {
      scene.style.perspectiveOrigin = `50% ${cardHeight / 2}px`;
    }
    const now = performance.now();
    const dt = Math.min(64, now - (assemble.current.last || now));
    assemble.current.last = now;
    const secRect = sectionRef.current?.getBoundingClientRect();
    // Section not reached yet / scrolled back above it. The card's centre reaches the middle of the viewport when the pin's top edge is at ~0.3h (card ~40px under the edge, ~460px tall): the text starts assembling right then.
    const above = !secRect || secRect.top >= h * (phone ? 1 : 0.3);
    // Vertical rest position of the card (2026-09-26, per user request): the heading scrolls away normally. Until the card reaches the middle of the viewport it travels with the page (its natural spot is 40px under the pin's top edge = 100px under the heading); from there it holds at the centre while the pin engages, then leaves with the cards. Only a transform is written per frame (no layout): the highest corner of the resting card sits at h/2 - 230.
    if (secRect && sceneRef.current) {
      const stickyTop = Math.max(0, secRect.top);
      const dy = phone
        ? 0
        : Math.max(0, h / 2 - 230 - (stickyTop + 40));
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
      const ownHeight = phone ? el.offsetHeight : cardHeight;
      const { y, z, rot, sign, abs } = place(virtual - i, h, ownHeight, phone ? phoneNeighborTravel(ownHeight) : ownHeight + GAP);
      const centerOffset = phone ? (cardHeight - ownHeight) / 2 : 0;
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
      if (phone) {
        // Fade distant faces along the smoothed path instead of toggling them
        // at abs=1; keep far back faces from crossing the active transparent face.
        const fade = clamp01((abs - 1) / 0.35);
        el.style.opacity = '';
        el.style.setProperty('--work-cylinder-mobile-face-opacity', (1 - fade * fade * (3 - 2 * fade)).toFixed(4));
        // The number is a static anchor, separate from the fading surfaces.
        el.dataset.indexVisible = abs < 1.35 ? 'true' : 'false';
      }
      // Keep neighboring cards on the same continuous path as desktop.
      // Hiding at abs > 1 on phones made the next card pop in at its resting position.
      if (abs > 3) {
        el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = 'visible';
      const centerFactor = Math.max(0, 1 - abs);
      const tiltX = -m.y * 12 * centerFactor;
      const tiltY = m.x * 15 * centerFactor;
      el.style.zIndex = Math.round(z).toString();
      el.style.transform = `translateY(${(y + centerOffset).toFixed(2)}px) translateZ(${(phone ? z - 400 : z).toFixed(2)}px) rotateX(${(-sign * rot + tiltX).toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) rotateZ(${phone ? 0 : -3}deg)`;
      el.dataset.live = abs < 0.12 ? 'true' : 'false';
    });
  }, [phone]);

  useWorkWheelScroll(sectionRef, cases.length, onFrame, inView);

  const scrollToCard = (i: number) => {
    const sec = sectionRef.current;
    const el = cardRefs.current[i];
    if (!sec || !el || el.dataset.live === 'true') return;
    const pinTop = phone && stickyRef.current ? parseFloat(getComputedStyle(stickyRef.current).top) || 0 : 0;
    const top = sec.getBoundingClientRect().top + window.scrollY - pinTop;
    const scrollable = sec.offsetHeight - (stickyRef.current?.clientHeight || window.innerHeight);
    window.scrollTo({ top: top + (i / Math.max(1, cases.length - 1)) * scrollable });
  };

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${phone ? styles.phone : ''}`}
      style={{ height: phone ? `calc(var(--work-cylinder-phone-card-height) + ${Math.max(0, cases.length - 1) * 100}svh)` : `${cases.length * 100}vh` }}
      data-noasm="1"
      aria-label="Избранные кейсы"
    >
      <div ref={stickyRef} className={styles.sticky} data-work-viewport>
        <div ref={sceneRef} className={styles.scene}>
          <div className={styles.rig} style={phone ? undefined : { width: CARD_W, height: CARD_H }}>
            {cases.map((cs, i) => (
              <article
                key={cs.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={styles.card}
                style={{ width: phone ? undefined : CARD_W, height: phone ? undefined : CARD_H, visibility: 'hidden' }}
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
                  <div className={styles.content}>
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
                        <MagnetLink icon="arrow-right"
                          href={`/work/${cs.id}`}
                          variant="plain"
                          reducedMotion={reducedMotion}
                          onMouseEnter={cursor.onEnter}
                          onMouseLeave={cursor.onLeave}
                          onClick={saveScrollForReturn}
                        >
                          open case
                        </MagnetLink>
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`${styles.face} ${styles.back}`} aria-hidden="true">
                  {!phone && (
                    <span className={styles.backIndex}>
                      0{i + 1} / 0{cases.length}
                    </span>
                  )}
                  <span className={styles.backTag}>{cs.tag}</span>
                </div>
                {phone && (
                  <div className={styles.indexFace} aria-hidden="true" data-static-case-index>
                    <span className={styles.backIndex}>0{i + 1} / 0{cases.length}</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
