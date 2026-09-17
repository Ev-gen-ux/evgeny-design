import styles from './PromptSteps.module.css';

export interface PromptStepsProps {
  /** The "you" line — a one-line question framing whatever follows (usually a heading). */
  question: string;
  /**
   * Sr-only text kept in the DOM as the section's first child, matching what
   * CaseStudy's (currently unused, kept-for-revival) sidebar timeline used to
   * read as each section's label — omit outside CaseStudy.
   */
  tag?: string;
  /** For layout overrides at the call site (e.g. centering inside Contact) — the internal rows stay left-aligned regardless. */
  className?: string;
}

/**
 * "you ask / agent replies" — two small dot rows (grey = request, green =
 * resolved) with a connecting line inset exactly 4px from each dot. Extracted
 * 2026-08-03 from the case-study pages' local `PromptSteps` (itself rolled
 * out from the About section's original one-off version) once About and six
 * home-page sections all needed the exact same markup — the previous
 * per-file copies (CaseStudy.tsx, About.module.css) are gone, this is the
 * one implementation. No scroll-driven state machine: the dots' final state
 * is permanent, there was a request, here's the answer (usually the heading
 * rendered right after this component, by the call site).
 *
 * `data-chat-line="1"` on the question span (2026-08-03) marks it as a
 * candidate line for the persistent bottom ChatBar (see `useChatBar`), which
 * scans the DOM for these instead of duplicating the question text into a
 * separate content source — same convention as `useCaseSectionLabels`.
 */
export function PromptSteps({ question, tag, className }: PromptStepsProps) {
  const rootClass = [styles.promptSteps, className].filter(Boolean).join(' ');

  return (
    <>
      {tag !== undefined && <div className={styles.sectionTagHidden}>{tag}</div>}
      <div className={rootClass}>
        <div className={styles.promptStep}>
          <span className={styles.promptDot} data-tone="pending" />
          <span className={styles.promptRole}>you</span>
          <span className={styles.promptQuestion} data-chat-line="1">
            {question}
          </span>
        </div>
        <div className={styles.promptStep}>
          <span className={styles.promptDot} data-tone="done" />
          <span className={styles.promptRole}>agent</span>
        </div>
      </div>
    </>
  );
}
