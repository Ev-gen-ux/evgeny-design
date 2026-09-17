import type { ReactNode } from 'react';
import styles from './Tag.module.css';

export interface TagProps {
  /** `accent` — static Redline badge (case-study problem type). `chip` — neutral, lights up on hover (skills). */
  tone?: 'accent' | 'chip';
  className?: string;
  children: ReactNode;
}

export function Tag({ tone = 'accent', className, children }: TagProps) {
  return (
    <span className={[styles.tag, styles[tone], className].filter(Boolean).join(' ')}>{children}</span>
  );
}
