import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Send, Mail, PanelsTopLeft, FileText, CodeXml, PenTool, Globe, BookOpen } from 'lucide-react';
import styles from './Icon.module.css';

// Explicit imports keep the bundle limited to the icons used by the UI.
const icons = {
  send: Send,
  mail: Mail,
  prototype: PanelsTopLeft,
  document: FileText,
  code: CodeXml,
  design: PenTool,
  globe: Globe,
  book: BookOpen,
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
export function IconLabel({ icon, children, position = 'end' }: { icon: IconName; children: ReactNode; position?: 'start' | 'end' }) {
  return <span className={styles.label}>
    {position === 'start' && <Icon name={icon} />}
    <span>{children}</span>
    {position === 'end' && <Icon name={icon} />}
  </span>;
}
