import { useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useStageProgress, STAGE_HUES } from '../../hooks/useStageProgress';
import styles from './PageBackdrop.module.css';

/** 1:1 with MESH_BASE in Portfolio.dc.html. `dynAlpha` replaces the source's `color.includes('0.22') ? '0.24' : '0.14'` check — same two values, just named instead of sniffed out of a placeholder string. */
const MESH_BASE = [
  { top: '-8%', right: '-10%', left: undefined, size: '46vw', color: 'rgba(var(--color-accent-rgb), 0.22)', factor: 0.05, delay: '0s', dynAlpha: '0.24' },
  { top: '32%', left: '-14%', right: undefined, size: '42vw', color: 'rgba(var(--color-slate-mist-rgb), 0.16)', factor: -0.03, delay: '-6s', dynAlpha: undefined },
  { top: '64%', right: '-12%', left: undefined, size: '40vw', color: 'rgba(var(--color-accent-rgb), 0.13)', factor: 0.04, delay: '-11s', dynAlpha: '0.14' },
  { top: '90%', left: '6%', right: undefined, size: '38vw', color: 'rgba(var(--color-graphite-rgb), 0.9)', factor: -0.02, delay: '-3s', dynAlpha: undefined },
] as const;

const INITIAL_HUE = STAGE_HUES[0];
const INITIAL_STAGE_COLOR = `oklch(0.65 0.18 ${INITIAL_HUE.toFixed(1)})`;

/**
 * Root-level ambient layers rendered once for the whole page (not scoped to
 * hero) — 1:1 with the wash/meshBlobs/grain backgrounds and the scroll-stage
 * progress bar. Not gated by prefers-reduced-motion as a whole — each layer
 * disables its own animation individually. The bottom-right STAGE badge this
 * used to also render was removed 2026-08-03; the `StageBadge` component and
 * the `badgeDotRef`/`badgeTextRef` plumbing it used were deleted outright
 * 2026-10-24 (dead code — never rendered on any page since that removal).
 *
 * Self-contained since the smoothness pass (2026-08-02): used to receive a
 * `stage` prop computed once in Home via useStageProgress's React state, which
 * meant Home (and everything under it) re-rendered on every scroll frame. Now
 * owns its own refs and useStageProgress writes into them directly — see that
 * hook's docstring.
 *
 * The network-graph canvas (diagonal lines + dots tracing the 5 stage points,
 * fixed over the whole page) was removed by explicit user request (2026-08-02)
 * — called out as visual noise. See useGraphCanvas's docstring/git history if
 * it needs to come back; the hook itself was deleted, not just unused.
 */
export function PageBackdrop() {
  const reducedMotion = useReducedMotion();
  const washRef = useRef<HTMLDivElement>(null);
  const blobOuterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const blobInnerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressFillRef = useRef<HTMLDivElement>(null);

  useStageProgress({ washRef, blobOuterRefs, blobInnerRefs, progressFillRef }, !reducedMotion);

  return (
    <>
      <div
        ref={washRef}
        className={[styles.wash, !reducedMotion && styles.washAnimated].filter(Boolean).join(' ')}
        style={{
          background: `conic-gradient(from 120deg at 30% 20%, oklch(var(--wash-l1) 0.05 ${INITIAL_HUE}) 0deg, oklch(var(--wash-l2) 0.045 ${INITIAL_HUE + 55}) 130deg, oklch(var(--wash-l3) 0.035 ${INITIAL_HUE - 65}) 250deg, oklch(var(--wash-l1) 0.05 ${INITIAL_HUE}) 360deg)`,
        }}
        aria-hidden="true"
      />

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
        {MESH_BASE.map((b, i) => (
          <div
            key={i}
            ref={(el) => {
              blobOuterRefs.current[i] = el;
            }}
            data-parallax-factor={b.factor}
            className={styles.blobOuter}
            style={{ top: b.top, left: b.left, right: b.right, width: b.size, height: b.size, transform: reducedMotion ? 'none' : 'translate3d(0,0,0)' }}
          >
            <div
              ref={(el) => {
                blobInnerRefs.current[i] = el;
              }}
              data-dyn-alpha={b.dynAlpha}
              className={[styles.blobInner, !reducedMotion && styles.blobAnimated].filter(Boolean).join(' ')}
              style={{
                background: b.dynAlpha ? `radial-gradient(circle, oklch(0.65 0.18 ${INITIAL_HUE} / ${b.dynAlpha}), transparent 70%)` : `radial-gradient(circle, ${b.color}, transparent 70%)`,
                animationDelay: b.delay,
              }}
            />
          </div>
        ))}
      </div>

      <div className={[styles.grain, !reducedMotion && styles.grainAnimated].filter(Boolean).join(' ')} aria-hidden="true" />

      <div className={styles.progressTrack}>
        <div ref={progressFillRef} className={styles.progressFill} style={{ width: '0%', background: INITIAL_STAGE_COLOR }} />
      </div>
    </>
  );
}
