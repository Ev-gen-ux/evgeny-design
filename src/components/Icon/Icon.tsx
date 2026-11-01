import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import styles from './Icon.module.css';

// Explicit imports keep the bundle limited to the icons used by the UI.
const icons = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
} as const;

export type IconName = keyof typeof icons;

/** Decorative icon: its containing control supplies the accessible label. */
export function Icon({ name }: { name: IconName }) {
  const Glyph = icons[name];
  return <Glyph className={styles.icon} aria-hidden="true" focusable="false" data-noasm="1" />;
}

/** Keep text in its own span so letter-assembly never rewrites the SVG. */
export function IconLabel({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <span className={styles.label}>
    <span>{children}</span>
    <Icon name={icon} />
  </span>;
}
