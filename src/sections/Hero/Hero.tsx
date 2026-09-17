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
  const lattice = useLatticeLayout();
  const { canvasRef, failed: showThreeFallback } = useHeroThreeScene(!reducedMotion && !isTouch);
  const tokenCounter = useTokenCounter(hero.headline, reducedMotion);

  const spotBackground =
    spot.active && !reducedMotion
      ? `radial-gradient(320px circle at ${spot.x}px ${spot.y}px, rgba(var(--color-accent-rgb),0.14), transparent 60%)`
      : 'transparent';

  return (
    <Section id="hero" stageAnchor={0} className={styles.section} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className={[styles.grid, !reducedMotion && styles.gridAnimated].filter(Boolean).join(' ')} aria-hidden="true" />
      <div className={styles.spot} style={{ background: spotBackground }} aria-hidden="true" />
      <div
        className={styles.sceneWrap}
        aria-hidden="true"
        style={{
          left: lattice.left,
          top: lattice.top,
          width: lattice.size,
          height: lattice.size,
          opacity: isNarrow ? 0.3 : Number(lattice.opacity),
          display: isNarrow ? 'none' : 'block',
        }}
      >
        <canvas ref={canvasRef} className={styles.sceneCanvas} />
        {showThreeFallback && <div className={styles.fallbackOrb} />}
      </div>
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
          {hero.sub}
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
      </div>
    </Section>
  );
}
