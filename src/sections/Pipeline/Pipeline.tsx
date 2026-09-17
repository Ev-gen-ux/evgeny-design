import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { Section, Text, AgentSessionTimeline } from '../../components';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { usePipelineScroll } from '../../hooks/usePipelineScroll';
import { pipelineHeader, pipelineStages, outcomeClaims, agentSessionSteps } from '../../content/pipeline';
import styles from './Pipeline.module.css';

/** Tablet-and-below — the sticky-pin frame needs real horizontal room (the source's `minmax(240px, 32%)` left column) that a phone/tablet viewport doesn't have; below this it falls back to the same static stacked layout `prefers-reduced-motion` already used. Same value as the rest of the site's new tablet breakpoint (see `_process_log.md`'s 2026-09-17 responsive-pass entry). */
const TABLET_BREAKPOINT = 768;

/**
 * 1:1 with pipelineRenderVals()/plScrollState()/drivePipeline() in
 * Portfolio.dc.html — a pinned scrollytelling section. Non-stacked: the
 * section is `(stages+1)*105vh` tall with a `position:sticky` frame inside;
 * only one of the 5 panels (4 stages + outcome) is visible at a time, swapping
 * as you scroll through the pinned zone, driven by usePipelineScroll. Stacked:
 * the source's own static fallback — panels just stack normally, no sticky,
 * no height trick.
 *
 * Responsive pass (2026-09-17): "stacked" used to mean only `reducedMotion`
 * (an OS a11y setting, not a viewport check) — the sticky two-column frame
 * had zero handling for narrow viewports and would either force horizontal
 * scroll or crush the right panel. `stackedLayout` below now also triggers
 * below `TABLET_BREAKPOINT`, reusing the exact same fallback markup/styles
 * for "narrow screen" as for "reduced motion" — no new layout was invented.
 * `AgentSessionTimeline`'s own visibility deliberately stays keyed to the
 * *real* `reducedMotion` only, not `stackedLayout` — it's a content/identity
 * element (the AGENT SESSION log), not part of the sticky-pin mechanic, and
 * should keep showing on tablet/phone even though the frame isn't sticky
 * there.
 */
/** All panels start hidden/below — the rAF loop in usePipelineScroll takes over and corrects panel 0 to visible on its first tick, right after mount. */
const initialPanelStyle: CSSProperties = { opacity: 0, transform: 'translateY(calc(-50% + 70px))', pointerEvents: 'none' };

export function Pipeline() {
  const reducedMotion = useReducedMotion();
  const windowWidth = useWindowWidth();
  const stackedLayout = reducedMotion || windowWidth <= TABLET_BREAKPOINT;
  const sectionRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepDotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const stepOutcomeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRowRefs = useRef<(HTMLElement | null)[]>([]);
  const panelCount = pipelineStages.length + 1;
  usePipelineScroll(sectionRef, panelRefs, stepDotRefs, stepOutcomeRefs, stepRowRefs, panelCount, !stackedLayout);

  const sectionStyle: CSSProperties = stackedLayout ? { position: 'relative' } : { position: 'relative', height: `${panelCount * 105}vh` };

  const stickyStyle: CSSProperties = stackedLayout
    ? { padding: '80px clamp(20px,6vw,80px)' }
    : {
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(16px,4vh,48px) clamp(20px,5vw,64px)',
      };

  const frameStyle: CSSProperties = stackedLayout
    ? { maxWidth: 1100, margin: '0 auto' }
    : {
        width: '100%',
        maxWidth: 1240,
        height: 'min(78vh, 720px)',
        border: '1px solid rgba(var(--color-slate-mist-rgb), 0.3)',
        background: 'transparent',
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 32%) 1fr',
      };

  const leftStyle: CSSProperties = stackedLayout
    ? { marginBottom: 48 }
    : {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(24px,3.4vw,44px)',
        borderRight: '1px solid rgba(var(--color-slate-mist-rgb), 0.25)',
      };

  const rightStyle: CSSProperties = stackedLayout ? {} : { position: 'relative', overflow: 'hidden' };

  const panelBaseStyle: CSSProperties = stackedLayout
    ? { padding: '0 0 44px 0', marginBottom: 32, borderBottom: '1px solid rgba(var(--color-slate-mist-rgb), 0.18)' }
    : {
        position: 'absolute',
        left: 'clamp(28px,4vw,72px)',
        right: 'clamp(28px,4vw,72px)',
        top: '50%',
        willChange: 'transform, opacity',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      };

  return (
    <Section id="pipeline" innerRef={sectionRef} style={sectionStyle}>
      <div style={stickyStyle}>
        <div style={frameStyle}>
          <div data-pl-fixed="1" style={leftStyle}>
            <div>
              <Text variant="eyebrow">{pipelineHeader.eyebrow}</Text>
              <Text variant="pipelineHeading" as="h2" style={{ margin: '12px 0 0' }}>
                {pipelineHeader.title}
              </Text>
              <p className={styles.sub}>{pipelineHeader.sub}</p>
            </div>
            {!reducedMotion && (
              <AgentSessionTimeline steps={agentSessionSteps} dotRefs={stepDotRefs} outcomeRefs={stepOutcomeRefs} rowRefs={stepRowRefs} />
            )}
          </div>

          <div style={rightStyle}>
            {pipelineStages.map((st, i) => (
              <div
                key={st.tag}
                data-pl-panel={i}
                ref={(el) => {
                  panelRefs.current[i] = el;
                }}
                style={{ ...panelBaseStyle, ...(stackedLayout ? {} : initialPanelStyle) }}
              >
                <div className={styles.stageTag}>{st.tag}</div>
                <h3 className={styles.stageTitle}>{st.title}</h3>
                <p className={styles.stageText}>{st.text}</p>
                <div className={styles.stageMetric}>
                  <span className={styles.stageMetricValue}>{st.metric.value}</span>
                  <span className={styles.stageMetricLabel}>{st.metric.label}</span>
                </div>
                <div className={styles.stepsRow}>
                  {st.steps.map((step) => (
                    <span key={step} className={styles.stepChip}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <div
              data-pl-panel={pipelineStages.length}
              ref={(el) => {
                panelRefs.current[pipelineStages.length] = el;
              }}
              style={{ ...panelBaseStyle, ...(stackedLayout ? {} : initialPanelStyle) }}
            >
              <div className={styles.outcomeTag}>
                input → process → <strong>resolved</strong>
              </div>
              <div className={styles.claims}>
                {outcomeClaims.map((c) => (
                  <div key={c} className={styles.claim}>
                    {c}
                  </div>
                ))}
              </div>
              <div>
                <div className={styles.loopLabel}>iteration loop</div>
                <div className={styles.loopRow}>
                  <span>Test</span>
                  <span className={styles.loopArrow}>→</span>
                  <span>Fix</span>
                  <span className={styles.loopArrow}>→</span>
                  <span>Redeploy</span>
                  <span className={styles.loopArrow}>→</span>
                  <span>Retest</span>
                  <span className={styles.loopCycle}>↻</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
