import type { RefObject } from 'react';
import styles from './ChatBar.module.css';

export interface ChatBarRefs {
  barRef: RefObject<HTMLDivElement | null>;
  textRef: RefObject<HTMLSpanElement | null>;
  statusDotRef: RefObject<HTMLSpanElement | null>;
  statusTextRef: RefObject<HTMLSpanElement | null>;
}

/**
 * Persistent "you're chatting with the agent the whole time you scroll" bar,
 * pinned to the bottom of the viewport (added 2026-08-03, per user request —
 * option A of the analysis: one line per section, typed once on arrival,
 * held until the next one). Ties together what was previously several
 * separate, disconnected touches (each section's own PromptSteps, the header's
 * session indicator, Pipeline's AGENT SESSION log) into one continuous
 * thread. Visual language deliberately reuses the site's own existing
 * terminal/mono convention (arrow, mono font, accent dot) rather than
 * mimicking an external chat app.
 *
 * Pure presentation + ref-attachment points — `useChatBar` owns all the
 * driving: which line is "current," the typewriter reveal, the status text,
 * and the near-the-footer visibility handling.
 */
export function ChatBar({ barRef, textRef, statusDotRef, statusTextRef }: ChatBarRefs) {
  return (
    <div ref={barRef} className={styles.bar} data-noasm="1" aria-hidden="true">
      <span className={styles.arrow}>▸</span>
      <span className={styles.typing}>
        <span ref={textRef} className={styles.text} />
        <span className={styles.cursor} />
      </span>
      <span className={styles.status}>
        <span ref={statusDotRef} className={styles.statusDot} data-state="active" />
        <span ref={statusTextRef} className={styles.statusText} />
      </span>
    </div>
  );
}
