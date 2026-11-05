import { useCallback, useEffect, useState } from 'react';
import { loadTheme, saveTheme, type ThemePref } from '../lib/storage';

const ORDER: ThemePref[] = ['system', 'light', 'dark'];

/** Theme preference: follows the OS by default; light/dark set `data-theme` on <html>. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemePref>(loadTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  const cycle = useCallback(() => setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]), []);
  return { theme, cycle };
}
