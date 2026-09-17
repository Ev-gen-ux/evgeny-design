import { useThemeToggle } from '../../hooks/useThemeToggle';
import styles from './ThemeToggle.module.css';

/**
 * Temporary evaluation control (2026-09-17) for the experimental monochrome/
 * grain theme — a plain button, not styled to match the rest of the site's
 * "agent session" language on purpose, so it reads clearly as a test rig,
 * not a finished feature. Once the visual direction is settled, this either
 * gets restyled into a real permanent toggle or removed outright — ask
 * before assuming either.
 */
export function ThemeToggle() {
  const [theme, toggle] = useThemeToggle();

  return (
    <button type="button" className={styles.toggle} onClick={toggle}>
      {theme === 'mono' ? 'mono: on' : 'mono: off'}
    </button>
  );
}
