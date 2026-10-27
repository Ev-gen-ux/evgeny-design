import { useEffect, useRef } from 'react';
import { Section, Text, Link } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import { useSpotGlow } from '../../hooks/useSpotGlow';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';
// LOCAL PREVIEW SWAP (2026-10-27, not in prod) — Particle Portrait bust fully
// in place of Saturn (rings removed, bust-only). See usePortraitSaturnScene.ts / _process_log.md.
import { usePortraitSaturnScene as useSaturnThreeScene } from '../../hooks/usePortraitSaturnScene';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { useTokenCounter } from '../../hooks/useTokenCounter';
import { hero, heroCtas, typeTags } from '../../content/hero';
import styles from './Hero.module.css';

export interface HeroProps {
  cursor: CursorTracker;
}

export function Hero({ cursor }: HeroProps) {
  const reducedMotion = useReducedMotion();
  const isTouch = useIsTouchDevice();
  const { spot, onMove, onLeave } = useSpotGlow();
  const windowWidth = useWindowWidth();
  // Phone breakpoint (2026-09-17, same 640px used across the responsive
  // pass — see _process_log.md) — was 760px, which already swallowed most
  // of the tablet range; the icosahedron should stay visible on tablet and
  // only disappear on phone, per explicit user decision.
  const isNarrow = windowWidth < 640;
  // Line break before «AI Design Pipeline» (2026-09-26/28, per user request): a real <br> element disqualifies this
  // paragraph from the assembly engine's candidate check (it requires an element's children to be ALL text nodes —
  // see useAssemblyAnimation.ts's `kids.every(n => n.nodeType === 3)` — so with a <br> the whole .sub text silently
  // stopped assembling on every load, found 2026-09-28). A Unicode LINE SEPARATOR (U+2028) forces the same visual
  // break without adding a DOM element: `\s` in the engine's own split regex matches it, so it is carried through
  // untouched as a plain (non-letter) text node between the two split halves, and the browser still renders it as a
  // hard line break under `white-space: normal` — desktop only; on phone/tablet the two halves are joined by a plain
  // space and wrap naturally.
  const subText = windowWidth >= 1025 ? hero.sub[0] + '\u2028' + hero.sub[1] : hero.sub[0] + ' ' + hero.sub[1];
  const sectionRef = useRef<HTMLElement>(null);
  // Phone (2026-10-24, per user-supplied reference of the old mobile layout):
  // Saturn now takes the in-flow slot the removed icosahedron used to occupy
  // (CSS `order: 6` between the CTA row and the goal line, see Hero.module.css),
  // instead of staying off on every touch device — `isTouch` alone no longer
  // gates phones, only tablets (where `isNarrow` is false) keep the old
  // touch-disables-Saturn rule.
  //
  // `saturnMounted` is the STABLE condition that decides whether the layer's
  // <div>/<canvas> exist in the DOM at all — it must never flip rapidly, or
  // every flip inserts/removes a whole flex item and shoves every element
  // below it up/down (a real bug, found live 2026-10-24: a layout shift this
  // size mid-scroll was enough to re-trigger the page's own scroll-reveal/
  // letter-assembly system on the goal text below, catching it re-scattering
  // mid-animation with the sticky nav overlapping it in a stale frame).
  // `heroInView` — whether the section is actually on screen — DOES flip
  // rapidly near the scroll threshold, so it only ever feeds `saturnRunning`,
  // which just pauses/resumes the WebGL render loop (useThreeScene tears down
  // the renderer+rAF on `enabled: false`, not any DOM node) — same performance
  // guard as before, with no layout consequence.
  const saturnMounted = !reducedMotion && (isNarrow || !isTouch);
  // No visibility-gated pause on phone any more (2026-10-25, reverted same
  // day it was added — live report, explicit user call). The render loop
  // used to pause/resume via `heroInView` (an IntersectionObserver at
  // `threshold: 0.05`) as a battery-saving guard once Hero was almost fully
  // scrolled past. `useThreeScene`'s `enabled` isn't a cheap play/stop flag
  // though — toggling it tears the whole WebGL context down and rebuilds it
  // (dynamic `three` import, shader compile, buffer upload), and ordinary
  // scroll momentum crossing that 0.05 boundary more than once in quick
  // succession fired that rebuild repeatedly, right where the stutter was
  // reported (only on Home — case-study pages mount no Saturn scene at all,
  // and never showed the bug). A 150ms debounce on the flip shipped first
  // as a smaller fix, but the simpler call is to not pause it at all:
  // Saturn just runs continuously for as long as it's mounted, same as it
  // already does on desktop/tablet (`saturnRunning` there was never gated
  // by visibility either, see below) — mobile's in-flow Saturn (not a
  // fixed/crossfading backdrop, see the crossfade effect further down,
  // desktop-only) simply scrolls off naturally like any other block once
  // the user passes it, exactly like it visually already appeared to work.
  const saturnRunning = saturnMounted;
  // Mobile-only anchor (2026-10-27): an invisible in-flow spacer that reserves
  // the exact 20px/20px gap to the CTA row and the goal text (same box the
  // figure used to be visually clipped to — see Hero.module.css's
  // `.saturnSpacer`), while the actual canvas (below) is now a full-section
  // layer so the dust cloud isn't boxed in. The hook reads this element's
  // on-screen rect to vertically center the bust inside it, on phone only —
  // desktop ignores this ref entirely (its own fixed full-viewport shift is
  // unchanged, see usePortraitSaturnScene.ts).
  const saturnSpacerRef = useRef<HTMLDivElement>(null);
  const { canvasRef: saturnCanvasRef } = useSaturnThreeScene(saturnRunning, saturnSpacerRef);
  const saturnLayerRef = useRef<HTMLDivElement>(null);
  // Scroll-driven crossfade (plan: "Saturn-слой гаснет по мере выхода Hero из
  // вьюпорта") — opacity set directly via ref, not React state, to avoid a
  // re-render on every scroll tick. Desktop/tablet only: on phone the layer is
  // an ordinary in-flow block (see Hero.module.css), not a fixed full-bleed
  // backdrop, so there's nothing to crossfade against scroll.
  useEffect(() => {
    if (!saturnMounted || isNarrow) return;
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      if (saturnLayerRef.current) saturnLayerRef.current.style.opacity = String(1 - progress);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [saturnMounted, isNarrow]);
  const tokenCounter = useTokenCounter(hero.headline, reducedMotion);

  const spotBackground =
    spot.active && !reducedMotion
      ? `radial-gradient(320px circle at ${spot.x}px ${spot.y}px, rgba(var(--color-accent-rgb),0.14), transparent 60%)`
      : 'transparent';

  return (
    <Section
      id="hero"
      stageAnchor={0}
      className={styles.section}
      innerRef={sectionRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className={[styles.grid, !reducedMotion && styles.gridAnimated].filter(Boolean).join(' ')} aria-hidden="true" />
      <div className={styles.spot} style={{ background: spotBackground }} aria-hidden="true" />
      {/* 2026-10-27: canvas layer is a sibling of `.inner`, not nested inside
          it — on phone it's `position:absolute; inset:0` against `.section`
          (which clips via its own `overflow:hidden`, so the dust cloud still
          can't bleed onto neighboring sections) instead of being boxed into
          a small `width/height`-constrained div. That was the actual source
          of "частицы опять в обрезанном контейнере": a 130vw/62vh container
          IS a clipped container, just a differently-sized one than the
          earlier complaints — any div with explicit width/height clips its
          own canvas at its own edges, full-bleed-within-the-section is the
          only way to avoid a visible box edge while still honoring "только в
          рамках главного экрана". Desktop keeps its original
          `position:fixed` (unaffected by moving this element — DOM position
          relative to `.inner` never mattered there, see Hero.module.css). */}
      {saturnMounted && (
        <div ref={saturnLayerRef} className={styles.saturnLayer} aria-hidden="true">
          <canvas ref={saturnCanvasRef} className={styles.saturnCanvas} />
        </div>
      )}
      <div className={styles.inner}>
        {/* 2026-10-27: invisible spacer, phone only — reserves the exact
            20px/20px gap to the CTA row and the goal text that the figure
            used to visually occupy, so the document flow keeps the same
            rhythm even though the canvas itself moved out of `.inner` (see
            above). The hook reads this element's rect every resize to
            vertically center the bust inside it. Renders as nothing
            (`display:none` outside the phone breakpoint, see
            `.saturnSpacer` in Hero.module.css) — desktop's grid layout is
            untouched by its presence in the DOM. */}
        {saturnMounted && <div ref={saturnSpacerRef} className={styles.saturnSpacer} aria-hidden="true" />}
        <Text variant="eyebrow" className={styles.eyebrow}>
          {hero.eyebrow}
        </Text>
        <div
          data-noasm="1"
          className={styles.tokenCounter}
          style={{ opacity: tokenCounter.opacity }}
        >
          {tokenCounter.text}
        </div>
        <Text variant="hero" as="h1" className={styles.headline}>
          {hero.headline}
        </Text>
        <Text variant="bodyMd" color="body" className={styles.sub}>
          {subText}
        </Text>
        <div className={styles.ctaRow}>
          {heroCtas.map((cta) => (
            <Link
              key={cta.id}
              href={cta.url}
              variant="underline"
              external={cta.external}
              onMouseEnter={cursor.onEnter}
              onMouseLeave={cursor.onLeave}
            >
              {cta.label}
            </Link>
          ))}
        </div>
        <div className={styles.typeTags}>
          {typeTags.map((t) => (
            <span key={t.k} className={styles.typeTag}>
              <span className={styles.typeTagKey}>{t.k}:</span>
              {t.v}
            </span>
          ))}
        </div>
        <Text variant="hero" as="p" className={styles.goal}>
          {hero.goal}
        </Text>
      </div>
    </Section>
  );
}
