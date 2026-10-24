import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './GrainGradient.module.css';

export interface GrainGradientProps {
  /** Stronger, more saturated streak + heavier grain — home page only. */
  intense?: boolean;
  /** Mirrors the streak so the glow reads from the left edge — case-study pages. */
  flip?: boolean;
  /**
   * False when nested inside another element that already paints its own
   * background (e.g. MobileNavOverlay's tinted, blurred panel) — otherwise
   * this component's own opaque page-background fill would sit on top of
   * and flatten that element's backdrop-filter look. Just the streak+noise
   * layer shows through in that case. True (default) for the site-wide
   * instance mounted directly in App.tsx.
   */
  withBackground?: boolean;
}

/**
 * Site-wide diagonal grain-gradient backdrop (2026-10-24 redesign, per the
 * Portfolio Design Kit brief's "Option D" pure-CSS recipe: a blurred,
 * rotated streak of layered radial-gradients behind an SVG feTurbulence
 * noise layer, blended with mix-blend-mode: overlay). Fixed behind
 * everything (z-index: -1) so it shows through on every route without each
 * page having to mount it — one instance in App.tsx. `intense` drives a
 * stronger variant for the home page; case-study/other pages get the
 * calmer default. Colors come from the design-kit tokens (colors.css):
 * blue-950 base, mauve streak, green accent fleck — never raw hex here.
 */
export function GrainGradient({ intense = false, flip = false, withBackground = true }: GrainGradientProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={`${styles.root} ${intense ? styles.intense : ''} ${flip ? styles.flip : ''} ${
        withBackground ? '' : styles.bare
      }`}
      aria-hidden="true"
    >
      <div className={`${styles.streak} ${!reducedMotion ? styles.streakAnimated : ''}`} />
      <div className={styles.noise} />
    </div>
  );
}
