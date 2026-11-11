import { breakpoints } from '../../tokens';
import { token, runtimeTokens } from '../../tokens';
import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { Section, Text, AgentSessionTimeline } from '../../components';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { useMobilePipelineSticky } from '../../hooks/useMobilePipelineSticky';
import { usePipelineScroll } from '../../hooks/usePipelineScroll';
import { pipelineHeader, pipelineStages, outcomeClaims, agentSessionSteps } from '../../content/pipeline';
import styles from './Pipeline.module.css';

/** Tablet-and-below — the sticky-pin frame needs real horizontal room (the source's `minmax(240px, 32%)` left column) that a phone/tablet viewport doesn't have; below this it falls back to the same static stacked layout `prefers-reduced-motion` already used. Same value as the rest of the site's new tablet breakpoint (see `_process_log.md`'s 2026-09-17 responsive-pass entry). */
const TABLET_BREAKPOINT = breakpoints.tablet;

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
const initialPanelStyle: CSSProperties = { opacity: 0, transform: token('pipeline-initial-panel-transform'), pointerEvents: 'none' };

export function Pipeline() {
  const reducedMotion = useReducedMotion();
  const windowWidth = useWindowWidth();
  const mobileLayout = windowWidth <= breakpoints.phone;
  const stackedLayout = reducedMotion || windowWidth <= TABLET_BREAKPOINT;
  const sectionRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepDotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const stepOutcomeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRowRefs = useRef<(HTMLElement | null)[]>([]);
  const panelCount = pipelineStages.length + 1;
  usePipelineScroll(sectionRef, panelRefs, stepDotRefs, stepOutcomeRefs, stepRowRefs, panelCount, !stackedLayout);

  useMobilePipelineSticky(sectionRef, mobileLayout && !reducedMotion);

  // `margin` (not `padding`) — this section's own height drives the pinned
  // scroll math (`usePipelineScroll` reads `offsetHeight`/`docTop`); padding
  // on the section itself would inflate that height and desync the pin.
  // Margin sits outside the box, so it's untouched by the scroll calc.
  // Matches the site-wide desktop convention (index.css, `@media (min-width:
  // 1025px)`): the 200px inter-section gap is always carried entirely by the
  // SECOND section's own top side, the first section contributes 0 at its
  // bottom. `#pipeline` isn't in that media query's selector list (it can't
  // take `padding-top` without inflating the pin height), so it supplies its
  // side of the gap via `marginTop: 200px` instead — and contributes nothing
  // at its own bottom, since `#experience`'s `padding-top: 200px !important`
  // (from the same rule) already supplies the full gap after it. 2026-10-28,
  // per user: gap to neighbors was inconsistent after reordering
  // Projects/Pipeline — mirror the convention, not a new one.
  const sectionStyle: CSSProperties = stackedLayout
    ? { position: 'relative' }
    : { position: 'relative', height: `${panelCount * runtimeTokens.pipeline.stageVh}vh`, marginTop: token('pipeline-section-margin-top') };

  const stickyStyle: CSSProperties = stackedLayout
    ? { padding: token('pipeline-sticky-padding') }
    : {
        position: 'sticky',
        top: 0,
        height: token('pipeline-sticky-height'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: token('pipeline-sticky-padding-desktop'),
      };

  const frameStyle: CSSProperties = stackedLayout
    ? { maxWidth: token('pipeline-frame-max-width'), margin: '0 auto' }
    : {
        width: '100%',
        maxWidth: token('pipeline-frame-max-width-desktop'),
        height: token('pipeline-frame-height'),
        border: token('pipeline-frame-border'),
        borderRadius: 'var(--radius-11)',
        display: 'grid',
        gridTemplateColumns: token('pipeline-frame-grid-template-columns'),
      };

  const leftStyle: CSSProperties = stackedLayout
    ? { marginBottom: token('pipeline-left-margin-bottom') }
    : {
        position: 'relative',
        zIndex: token('pipeline-left-z-index'),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: token('pipeline-left-padding'),
        borderRight: token('pipeline-left-border-right'),
      };

  const rightStyle: CSSProperties = stackedLayout ? {} : { position: 'relative', zIndex: token('pipeline-right-z-index'), overflow: 'hidden' };

  const panelBaseStyle: CSSProperties = stackedLayout
    ? { padding: token('pipeline-panel-base-padding'), marginBottom: token('pipeline-panel-base-margin-bottom'), borderBottom: token('pipeline-panel-base-border-bottom') }
    : {
        position: 'absolute',
        left: token('pipeline-panel-base-left'),
        right: token('pipeline-panel-base-right'),
        top: '50%',
        willChange: 'transform, opacity',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      };

  return (
    <Section id="pipeline" innerRef={sectionRef} style={sectionStyle} className={mobileLayout ? styles.mobile : undefined}>
      <div style={stickyStyle}>
        <div style={frameStyle} className={stackedLayout ? undefined : styles.frame}>
          <div data-pl-fixed="1" data-mobile-pipeline-heading={mobileLayout ? "1" : undefined} style={leftStyle}>
            <div>
              <Text variant="eyebrow">{pipelineHeader.eyebrow}</Text>
              <Text variant="pipelineHeading" as="h2" style={{ margin: token('pipeline-layout-margin') }}>
                {pipelineHeader.title}
              </Text>
              <p className={styles.sub}>{pipelineHeader.sub}</p>
            </div>
            {!reducedMotion && (
              <AgentSessionTimeline steps={agentSessionSteps} dotRefs={stepDotRefs} outcomeRefs={stepOutcomeRefs} rowRefs={stepRowRefs} />
            )}
          </div>

          <div data-mobile-pipeline-panels={mobileLayout ? "1" : undefined} style={rightStyle}>
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
                {/* Two sibling elements, not one div with a bare text node
                    next to <strong> (2026-09-18) — the assembly-animation
                    candidate check requires an element's children to be
                    ALL text nodes; a mix of a bare text node + an element
                    child disqualifies the whole thing, so the leading
                    "input → process → " text was silently never split or
                    animated at all (only the word inside <strong> was),
                    reported as this tag "never animating" on mobile. Each
                    span now qualifies as its own valid candidate. */}
                <span>input → process → </span>
                <strong>resolved</strong>
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
