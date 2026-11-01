import type { ReactNode, MouseEvent } from 'react';
import { Link, type LinkVariant } from './Link';
import type { IconName } from '../Icon';

export interface MagnetLinkProps {
  href: string;
  variant?: LinkVariant;
  external?: boolean;
  reducedMotion: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
  icon?: IconName;
}

/** Links share the app-level useInteractiveMagnet controller. */
export function MagnetLink({ href, variant, external, onMouseEnter, onMouseLeave, onClick, children, icon }: MagnetLinkProps) {

  return (
    <Link
      href={href}
      variant={variant}
      external={external}
      icon={icon}
      onMouseEnter={() => {
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        onMouseLeave?.();
      }}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
