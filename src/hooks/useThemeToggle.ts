import { useCallback, useEffect, useState } from 'react';

export type SiteTheme = 'default' | 'mono';
const STORAGE_KEY = 'evgeny-design-theme';

function readInitialTheme(): SiteTheme {
  if (typeof window === 'undefined') return 'default';
  return window.localStorage.getItem(STORAGE_KEY) === 'mono' ? 'mono' : 'default';
}

/**
 * Experimental theme toggle (2026-09-17) — the monochrome/grain variant is
 * opt-in only, this is what flips `data-theme` on `<html>`. A plain React
 * state hook (not the site's usual void-returning ref-driven pattern): it
 * doesn't run every animation frame, just on the rare click, so there's no
 * React Compiler concern here the way there is for the scroll-driven hooks.
 * Persists to localStorage purely so the person testing it doesn't lose the
 * toggle on refresh — this is a temporary evaluation aid, not a promise that
 * every visitor's preference should be remembered forever.
 */
export function useThemeToggle(): [SiteTheme, () => void] {
  const [theme, setTheme] = useState<SiteTheme>(readInitialTheme);

  useEffect(() => {
    if (theme === 'mono') {
      document.documentElement.dataset.theme = 'mono';
    } else {
      delete document.documentElement.dataset.theme;
    }
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'mono' ? 'default' : 'mono'));
  }, []);

  return [theme, toggle];
}
