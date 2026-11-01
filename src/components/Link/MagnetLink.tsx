import type { ReactNode, MouseEvent } from 'react';
import { Link, type LinkVariant } from './Link';

export interface MagnetLinkProps {
  href: string;
  variant?: LinkVariant;
  external?: boolean;
  reducedMotion: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
}

/** Links share the app-level useInteractiveMagnet controller. */
export function MagnetLink({ href, variant, external, onMouseEnter, onMouseLeave, onClick, children }: MagnetLinkProps) {

  return (
    <Link
      href={href}
      variant={variant}
      external={external}
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
