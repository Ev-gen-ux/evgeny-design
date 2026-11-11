import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Link } from '../../components';
import { navLinks } from '../../content/nav';
import { breakpoints } from '../../tokens';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import styles from './DesktopInlineMenu.module.css';

/** Inline disclosure above the phone breakpoint; the phone panel stays independent. */
export function DesktopInlineMenu({ cursor }: { cursor: CursorTracker }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const keyboardOpen = useRef(false);
  const onHome = useLocation().pathname === '/';

  useLayoutEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;
    const measure = () => root.style.setProperty('--desktop-menu-width', `${list.scrollWidth}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    document.fonts.ready.then(measure);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = matchMedia(`(max-width: ${breakpoints.phone}px)`);
    const reset = () => { if (media.matches) setOpen(false); };
    media.addEventListener('change', reset);
    return () => media.removeEventListener('change', reset);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (keyboardOpen.current) listRef.current?.querySelector('a')?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef} data-desktop-menu="1" data-open={open} data-noasm="1"
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus({ preventScroll: true });
        }
      }}>
      <div className={styles.reveal} inert={!open} aria-hidden={!open} id="desktop-inline-navigation">
        <div ref={listRef} className={styles.list}>
          <span className={styles.bracket} aria-hidden="true">[</span>
          <div className={styles.links}>
            {navLinks.map((link, index) => <Link key={link.href} href={onHome ? link.href : `/${link.href}`} variant="nav"
              className={styles.itemLink} style={{ '--desktop-link-index': index } as CSSProperties}
              onClick={() => setOpen(false)} onMouseEnter={cursor.onEnter} onMouseLeave={cursor.onLeave}>
              {link.label}
            </Link>)}
          </div>
          <span className={styles.bracket} aria-hidden="true">]</span>
        </div>
      </div>
      <button ref={triggerRef} className={styles.trigger} type="button"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open} aria-controls="desktop-inline-navigation"
        onMouseEnter={cursor.onEnter} onMouseLeave={cursor.onLeave}
        onClick={event => { keyboardOpen.current = event.detail === 0; setOpen(value => !value); }}>
        <span className={styles.label} aria-hidden="true">[ menu ]</span>
        <X className={styles.closeIcon} aria-hidden="true" focusable="false" />
      </button>
    </div>
  );
}
