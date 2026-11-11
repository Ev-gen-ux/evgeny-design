import { useEffect } from 'react';
import headerStyles from '../sections/Header/Header.module.css';
import './menu-input-mode.css';

/** Keep keyboard focus visible without showing keyboard rings on pointer clicks. */
export function useMenuInputMode() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(`nav.${headerStyles.nav}`);
    if (!header) return;
    const pointer = () => { header.dataset.menuInput = 'pointer'; };
    const keyboard = () => { header.dataset.menuInput = 'keyboard'; };
    header.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      header.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', keyboard, true);
      delete header.dataset.menuInput;
    };
  }, []);
}
