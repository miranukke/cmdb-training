import { emptyStats } from '../domain/stats';
import type { ExamStore, Favorites, StatsState } from '../domain/types';

// Keys of the original single-file app are kept so existing progress carries over.
export const KEYS = {
  exams: 'examquiz_v2',
  favorites: 'examquiz_favorites',
  stats: 'examquiz_stats_v1',
  theme: 'examquiz_theme',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when storage is unavailable or full. */
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadExams(): ExamStore {
  const raw = read<Record<string, unknown>>(KEYS.exams, {});
  // The old app could leave progress-only entries behind; keep only complete exams.
  return Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v && typeof v === 'object' && 'meta' in v && 'questions' in v),
  ) as ExamStore;
}
export const saveExams = (exams: ExamStore) => write(KEYS.exams, exams);

export const loadFavorites = (): Favorites => read<Favorites>(KEYS.favorites, {});
export const saveFavorites = (favs: Favorites) => write(KEYS.favorites, favs);

export function loadStats(): StatsState {
  const s = read<StatsState | null>(KEYS.stats, null);
  return s && s.v === 1 && s.q ? { ...emptyStats(), ...s } : emptyStats();
}
export const saveStats = (stats: StatsState) => write(KEYS.stats, stats);

export type ThemePref = 'system' | 'light' | 'dark';
export function loadTheme(): ThemePref {
  try {
    const t = localStorage.getItem(KEYS.theme);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}
export function saveTheme(theme: ThemePref): void {
  try {
    if (theme === 'system') localStorage.removeItem(KEYS.theme);
    else localStorage.setItem(KEYS.theme, theme);
  } catch {
    /* per-viewer convenience only */
  }
}
