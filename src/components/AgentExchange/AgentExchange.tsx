import { useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAgentExchangeReveal } from '../../hooks/useAgentExchangeReveal';
import styles from './AgentExchange.module.css';

export interface AgentExchangeProps {
  /** The "you" line — a one-line question framing the section that follows. */
  question: string;
  /** e.g. "0.4s" — illustrative, not measured. Shown once the response resolves. */
  resolvedIn: string;
  /** For layout overrides at the call site (e.g. centering inside Contact's centered section) — the exchange's own internal rows stay left-aligned regardless. */
  className?: string;
  /**
   * 'default' (original, 2026-08-02): full-width fading response bar.
   * 'compact' (2026-08-02, trial on About only, per user feedback that the
   * default read as "clutter" on a wide viewport — mostly empty bar for very
   * little content): narrow bordered card, no fill, and a 3-dot typing
   * indicator instead of the bar — same reveal timing, different payoff.
   */
  variant?: 'default' | 'compact';
}

/**
 * Simulated one-turn "you ask → agent resolves" exchange, shown once before
 * each major section (added 2026-08-02, per user reference screenshot and
 * request — "один раз перед каждым блоком", explicitly not per-card). Same
 * "AI agent working" language as the header's session indicator and
 * Pipeline's AGENT SESSION timeline — this is the most literal of the three,
 * so it's deliberately restrained: no real agent response text, just the
 * fact that one occurred (a resolve time), never rendered as an actual
 * interactive chat control (no input, no caret).
 */
export function AgentExchange({ question, resolvedIn, className, variant = 'default' }: AgentExchangeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const t = useAgentExchangeReveal(rootRef, reducedMotion);
  const resolved = t >= 1;

  const rootClass = [styles.exchange, variant === 'compact' && styles.exchangeCompact, className].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={rootClass} data-noasm="1">
      <div className={styles.row}>
        <span className={styles.arrow} aria-hidden="true">
          ▸
        </span>
        <span className={styles.role}>you</span>
        <span className={styles.question}>{question}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.arrow} aria-hidden="true">
          ◂
        </span>
        <span className={styles.role}>agent</span>
        {variant === 'compact' ? (
          <span className={styles.typing} aria-hidden="true" style={{ opacity: resolved ? 0 : 1 }}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </span>
        ) : (
          <span className={styles.barTrack} aria-hidden="true">
            <span className={styles.barFill} style={{ width: `${t * 100}%`, transition: reducedMotion ? 'none' : 'width 0.5s ease-out' }} />
          </span>
        )}
        <span className={styles.resolved} style={{ opacity: resolved ? 1 : 0 }}>
          {`resolved · ${resolvedIn}`}
        </span>
      </div>
    </div>
  );
}
