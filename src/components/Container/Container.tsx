import type { ElementType, ReactNode } from 'react';
import styles from './Container.module.css';

export type ContainerSize = 'narrow' | 'default' | 'wide';

export interface ContainerProps {
  size?: ContainerSize;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/**
 * Max-width + horizontal gutter wrapper. Sizes mirror the three max-widths used
 * across the current site: 900px (experience), 1100px (contact), 1200px (work/skills).
 */
export function Container({ size = 'default', as: As = 'div', className, children }: ContainerProps) {
  const sizeClass = size === 'narrow' ? styles.narrow : size === 'wide' ? styles.wide : styles.default;
  return <As className={[styles.container, sizeClass, className].filter(Boolean).join(' ')}>{children}</As>;
}
