import { useCallback, useEffect, useState } from 'react';

export type SiteTheme = 'default' | 'mono' | 'light';
const STORAGE_KEY = 'evgeny-design-theme';
const THEMES: SiteTheme[] = ['default', 'mono', 'light'];

function readInitialTheme(): SiteTheme {
  if (typeof window === 'undefined') return 'default';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return THEMES.includes(stored as SiteTheme) ? (stored as SiteTheme) : 'default';
}

/**
 * Experimental theme toggle (2026-09-17, extended 2026-10-22 to a 3-way
 * cycle default → mono → light → default) — flips `data-theme` on `<html>`.
 * Both mono and light are opt-in only; this is what drives both. A plain
 * React state hook (not the site's usual void-returning ref-driven pattern):
 * it doesn't run every animation frame, just on the rare click, so there's
 * no React Compiler concern here the way there is for the scroll-driven
 * hooks. Persists to localStorage purely so the person testing it doesn't
 * lose the toggle on refresh — this is a temporary evaluation aid, not a
 * promise that every visitor's preference should be remembered forever.
 */
export function useThemeToggle(): [SiteTheme, () => void] {
  const [theme, setTheme] = useState<SiteTheme>(readInitialTheme);

  useEffect(() => {
    if (theme === 'default') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]);
  }, []);

  return [theme, toggle];
}
