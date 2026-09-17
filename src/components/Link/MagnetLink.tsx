import type { ReactNode, MouseEvent } from 'react';
import { Link, type LinkVariant } from './Link';
import { useMagnetHover } from '../../hooks/useMagnetHover';

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

/**
 * Link + useMagnetHover wired together — own component (not inlined at each call
 * site) so every usage gets its own hook instance without breaking rules-of-hooks
 * inside a .map(). Used wherever the source drives a link with magnetHandlers():
 * the contact email, and each case card's footer links.
 */
export function MagnetLink({ href, variant, external, reducedMotion, onMouseEnter, onMouseLeave, onClick, children }: MagnetLinkProps) {
  const magnet = useMagnetHover(reducedMotion);

  return (
    <Link
      href={href}
      variant={variant}
      external={external}
      style={{ transform: magnet.transform }}
      onMouseEnter={() => {
        onMouseEnter?.();
        magnet.onMouseEnter();
      }}
      onMouseMove={magnet.onMouseMove}
      onMouseLeave={() => {
        onMouseLeave?.();
        magnet.onMouseLeave();
      }}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
