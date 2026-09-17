import type { RefObject } from 'react';
import styles from './AgentSessionTimeline.module.css';

export interface AgentSessionStep {
  verb: string;
  target: string;
  outcome: string;
}

export interface AgentSessionTimelineProps {
  /** Eyebrow label above the list — defaults to "agent session" (Pipeline's original wording). */
  label?: string;
  steps: readonly AgentSessionStep[];
  dotRefs: RefObject<(HTMLElement | null)[]>;
  outcomeRefs: RefObject<(HTMLElement | null)[]>;
  /**
   * Optional: each step's own row element (2026-08-03) — needed only by
   * callers that want the dot-scale/connecting-line assemble/disassemble
   * animation (currently just Pipeline). The line itself is a `::before`
   * pseudo-element, which JS can't touch directly via a ref — the driver
   * sets a `--agent-line-progress` CSS custom property on this row instead,
   * which the pseudo-element's `transform: scaleY(...)` reads.
   */
  rowRefs?: RefObject<(HTMLElement | null)[]>;
  /**
   * 'inline' (original, 2026-08-02): verb+target on one line, outcome text
   * right below, no border.
   * 'card' (2026-08-02, trial on log-service's case page only, per user
   * reference — a screenshot of this very tool's own tool-call transcript
   * UI): verb as a bold header, target/outcome packaged into an outlined
   * IN/OUT card below it — border only, deliberately no fill, per explicit
   * user instruction.
   */
  variant?: 'inline' | 'card';
}

/**
 * Simulated agent tool-call log (Read/Write/Generate/Edit/Handoff…), one dot
 * per step — grey (pending) → accent-colored (active) → green (done).
 * Originally built inline in Pipeline.tsx (2026-08-02); extracted into a
 * shared component the same day, per user request, so the case-study pages'
 * own scroll timeline could reuse the *exact* element — spacing, dot
 * mechanics, connecting line — instead of a plainer lookalike, just swapping
 * in per-page step content.
 *
 * Caller owns the driver: whichever hook is scroll-tracking that page writes
 * `data-state` ('pending'/'active'/'done') onto the dot ref and the outcome
 * ref (CSS colors the text by state) — this component is pure presentation
 * plus the ref-attachment points.
 *
 * `data-pl-step={i}` on each row (2026-08-03) lets Pipeline's assembly
 * animation (useAssemblyAnimation) split and scatter/reassemble every text
 * label per-step — verb, target, *and* outcome — timed to
 * `pipelineSync.stepT[i]`. Two earlier things stood in the way of this, both
 * removed the same day: the whole component used to carry a blanket
 * `data-noasm`, so none of this text ever animated at all (only the dot
 * color and outcome string changed); and the outcome text used to have its
 * textContent overwritten wholesale by the scroll driver (swapping to
 * "Working…" while active), which would have clobbered the assembly system's
 * spans the moment it ran. Per explicit user request, the swap is gone —
 * the outcome's own scatter→reassemble motion now reads as "in progress" on
 * its own, no placeholder text needed.
 *
 * `rowRefs` (2026-08-03) lets the driver also assemble/disassemble the dots
 * themselves and the connecting line, reversibly with scroll direction —
 * previously only the text content/color changed, the dot and line were
 * static the instant this component mounted.
 */
export function AgentSessionTimeline({ label = 'agent session', steps, dotRefs, outcomeRefs, rowRefs, variant = 'inline' }: AgentSessionTimelineProps) {
  return (
    <div className={styles.agentSession}>
      <div className={styles.agentSessionLabel}>{label}</div>
      <div className={styles.agentSteps}>
        {steps.map((step, i) => (
          <div
            key={`${step.verb}-${step.target}`}
            className={styles.agentStep}
            data-pl-step={i}
            ref={(el) => {
              if (rowRefs) rowRefs.current[i] = el;
            }}
          >
            <span
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              className={styles.agentStepDot}
              data-state="pending"
            />
            {variant === 'card' ? (
              <div className={styles.agentStepBody}>
                <div className={styles.agentStepVerbHead}>{step.verb}</div>
                <div className={styles.ioCard}>
                  <div className={styles.ioRow}>
                    <span className={styles.ioLabel}>in</span>
                    <span className={styles.ioValue}>{step.target}</span>
                  </div>
                  <div className={styles.ioRow}>
                    <span className={styles.ioLabel}>out</span>
                    <span
                      ref={(el) => {
                        outcomeRefs.current[i] = el;
                      }}
                      className={styles.ioValue}
                      data-outcome={step.outcome}
                      data-state="pending"
                    >
                      {step.outcome}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.agentStepBody}>
                <div className={styles.agentStepHead}>
                  <span className={styles.agentStepVerb}>{step.verb}</span> <span className={styles.agentStepTarget}>{step.target}</span>
                </div>
                <div
                  ref={(el) => {
                    outcomeRefs.current[i] = el;
                  }}
                  className={styles.agentStepOutcome}
                  data-outcome={step.outcome}
                  data-state="pending"
                >
                  {step.outcome}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
