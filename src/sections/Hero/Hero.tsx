import { useEffect, useRef, useState } from 'react';
import { Section, Text, Link } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import { useSpotGlow } from '../../hooks/useSpotGlow';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';
import { useHeroThreeScene } from '../../hooks/useHeroThreeScene';
import { useLatticeLayout } from '../../hooks/useLatticeLayout';
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
  const lattice = useLatticeLayout();
  const sectionRef = useRef<HTMLElement>(null);
  // Phone-only (2026-09-28): the WebGL figure is paused whenever the hero section
  // itself isn't on screen \u2014 on phone it's a normal in-flow element (see the
  // \u2264640px .sceneWrap rule in Hero.module.css), not the whole-page-roaming fixed
  // canvas desktop/tablet get, so keeping its render loop alive past the section
  // would just burn GPU for something the user can't see (per user request: the
  // figure is not needed while scrolling).
  const [heroInView, setHeroInView] = useState(true);
  useEffect(() => {
    if (!isNarrow) return;
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isNarrow]);
  const { canvasRef, failed: showThreeFallback } = useHeroThreeScene(!reducedMotion && (!isTouch || (isNarrow && heroInView)));
  const tokenCounter = useTokenCounter(hero.headline, reducedMotion);

  const spotBackground =
    spot.active && !reducedMotion
      ? `radial-gradient(320px circle at ${spot.x}px ${spot.y}px, rgba(var(--color-accent-rgb),0.14), transparent 60%)`
      : 'transparent';

  // Extracted so it can be rendered in two different DOM slots depending on
  // breakpoint (see below): desktop/tablet keep it as a section-level sibling
  // of .inner (position: fixed, roams via useLatticeLayout's inline styles);
  // phone renders it INSIDE .inner's flex flow instead (see the .sceneWrap
  // media rule in Hero.module.css) so it self-spaces from the CTA row/goal
  // via normal flex order + margins, rather than guessing a fixed top:%
  // against content whose height varies with copy length.
  const figureNode = (
    <div
      className={styles.sceneWrap}
      aria-hidden="true"
      style={
        isNarrow
          ? undefined
          : {
              left: lattice.left,
              top: lattice.top,
              width: lattice.size,
              height: lattice.size,
              opacity: Number(lattice.opacity),
            }
      }
    >
      <canvas ref={canvasRef} className={styles.sceneCanvas} />
      {showThreeFallback && <div className={styles.fallbackOrb} />}
    </div>
  );

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
      {!isNarrow && figureNode}
      <div className={styles.inner}>
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
        <Text variant="bodyMd" color="secondary" className={styles.sub}>
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
        {isNarrow && figureNode}
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
