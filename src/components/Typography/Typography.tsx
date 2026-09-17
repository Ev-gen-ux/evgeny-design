import type { CSSProperties, ElementType, ReactNode } from 'react';
import styles from './Typography.module.css';

export type TextVariant =
  | 'hero'
  | 'displayXl'
  | 'displayLg'
  | 'pipelineHeading'
  | 'sectionHeading'
  | 'cardTitle'
  | 'bodySm'
  | 'bodyMd'
  | 'bodyLg'
  | 'eyebrow'
  | 'tagText'
  | 'mono'
  | 'caption';

const DEFAULT_TAG: Record<TextVariant, ElementType> = {
  hero: 'h1',
  displayXl: 'h2',
  displayLg: 'h2',
  pipelineHeading: 'h2',
  sectionHeading: 'h2',
  cardTitle: 'h3',
  bodySm: 'p',
  bodyMd: 'p',
  bodyLg: 'p',
  eyebrow: 'div',
  tagText: 'span',
  mono: 'span',
  caption: 'span',
};

export interface TextProps {
  variant: TextVariant;
  as?: ElementType;
  color?: 'primary' | 'secondary' | 'body' | 'accent' | 'disabled';
  className?: string;
  style?: CSSProperties;
  id?: string;
  children: ReactNode;
}

const COLOR_VAR: Record<NonNullable<TextProps['color']>, string> = {
  primary: 'var(--color-text-primary)',
  secondary: 'var(--color-text-secondary)',
  body: 'var(--color-text-body)',
  accent: 'var(--color-accent)',
  disabled: 'var(--color-text-disabled)',
};

/** Typography primitive — variants mirror the distinct type usages found in the current site (see tokens/typography.ts). */
export function Text({ variant, as, color, className, style, id, children }: TextProps) {
  const Tag = as ?? DEFAULT_TAG[variant];
  return (
    <Tag
      id={id}
      className={[styles.base, styles[variant], className].filter(Boolean).join(' ')}
      style={color ? { color: COLOR_VAR[color], ...style } : style}
    >
      {children}
    </Tag>
  );
}
