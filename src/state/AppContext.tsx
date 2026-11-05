import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { isAnswerCorrect } from '../domain/scoring';
import { migrateFromProgress } from '../domain/stats';
import type { Answer, Question, StatsState } from '../domain/types';
import { loadConfiguredExams, parseExamFile, resolveExamSource } from '../lib/examSource';
import { loadExams, loadFavorites, loadStats, saveExams, saveFavorites, saveStats } from '../lib/storage';
import { reducer, type Action, type AppState, type QuizSession, type View } from './appState';

function initialState(): AppState {
  const exams = loadExams();
  return {
    exams,
    stats: migrateFromProgress(loadStats(), exams),
    favorites: loadFavorites(),
    view: { name: 'home', tab: 'overview' },
    session: null,
    sync: { status: 'idle' },
    toast: null,
  };
}

export interface AppApi {
  state: AppState;
  dispatch: (action: Action) => void;
  navigate: (view: View) => void;
  toast: (text: string) => void;
  /** Starts a session built by one of the builders in sessions.ts; null means "nothing to practise". */
  start: (session: QuizSession | null, emptyMessage?: string) => void;
  answer: (answer: Answer) => void;
  refreshExams: () => Promise<void>;
  importExamFile: (file: File) => Promise<void>;
  importStats: (file: File) => Promise<void>;
  toggleFavorite: (examId: string, question: Question) => void;
}

const AppContext = createContext<AppApi | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persistence. Each slice is written only when it changes.
  const warnedRef = useRef(false);
  const persist = useCallback((ok: boolean) => {
    if (!ok && !warnedRef.current) {
      warnedRef.current = true;
      dispatch({ type: 'toast', text: 'Browser storage is unavailable or full: progress may not be saved.' });
    }
  }, []);
  useEffect(() => persist(saveExams(state.exams)), [state.exams, persist]);
  useEffect(() => persist(saveStats(state.stats)), [state.stats, persist]);
  useEffect(() => persist(saveFavorites(state.favorites)), [state.favorites, persist]);

  const toast = useCallback((text: string) => dispatch({ type: 'toast', text }), []);
  const navigate = useCallback((view: View) => {
    dispatch({ type: 'navigate', view });
    window.scrollTo({ top: 0 });
  }, []);

  const start = useCallback((session: QuizSession | null, emptyMessage = 'No questions to practise here yet.') => {
    if (!session) {
      dispatch({ type: 'toast', text: emptyMessage });
      return;
    }
    dispatch({ type: 'session/started', session });
    window.scrollTo({ top: 0 });
  }, []);

  const answer = useCallback((a: Answer) => {
    const s = stateRef.current.session;
    if (!s) return;
    const { q } = s.items[s.index];
    dispatch({ type: 'session/answered', answer: a, correct: isAnswerCorrect(q, a), now: Date.now() });
  }, []);

  const refreshExams = useCallback(async () => {
    const source = resolveExamSource({
      envConfigUrl: import.meta.env.VITE_EXAMS_CONFIG_URL,
      dev: import.meta.env.DEV,
      search: window.location.search,
    });
    dispatch({ type: 'sync/started' });
    try {
      const res = await loadConfiguredExams(source, stateRef.current.exams);
      const parts = [`${res.loaded} exam${res.loaded === 1 ? '' : 's'} loaded from ${source.label}`];
      if (res.updated) parts.push(`${res.updated} updated since last visit`);
      if (res.failed.length) parts.push(`${res.failed.length} failed, using cached copy`);
      dispatch({ type: 'sync/finished', exams: res.exams, message: parts.join(' · '), ok: res.failed.length === 0 });
      if (res.updated) dispatch({ type: 'toast', text: `${res.updated} exam${res.updated === 1 ? ' was' : 's were'} updated (e.g. answer-key fixes).` });
    } catch (err) {
      dispatch({
        type: 'sync/finished',
        exams: stateRef.current.exams,
        message: `Couldn't reach ${source.label} (${(err as Error).message}). Showing cached exams.`,
        ok: false,
      });
    }
  }, []);

  useEffect(() => {
    void refreshExams();
  }, [refreshExams]);

  const importExamFile = useCallback(async (file: File) => {
    try {
      const data = parseExamFile(JSON.parse(await file.text()));
      const id = `exam_${Date.now()}`;
      const title = data.exam_metadata?.title || file.name.replace(/\.json$/i, '');
      dispatch({ type: 'exam/imported', id, exam: { meta: { title, total: data.questions.length }, questions: data.questions, progress: {} } });
      dispatch({ type: 'toast', text: `Imported "${title}" (${data.questions.length} questions)` });
    } catch (err) {
      dispatch({ type: 'toast', text: `Import failed: ${(err as Error).message}` });
    }
  }, []);

  const importStats = useCallback(async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { stats?: StatsState };
      if (!data.stats || data.stats.v !== 1 || typeof data.stats.q !== 'object') throw new Error('not a progress export');
      dispatch({ type: 'stats/replaced', stats: data.stats });
      dispatch({ type: 'toast', text: 'Progress restored' });
    } catch (err) {
      dispatch({ type: 'toast', text: `Restore failed: ${(err as Error).message}` });
    }
  }, []);

  const toggleFavorite = useCallback((examId: string, question: Question) => {
    const key = `${examId}_${question.id}`;
    const adding = !stateRef.current.favorites[key];
    dispatch({ type: 'favorite/toggled', examId, question });
    dispatch({ type: 'toast', text: adding ? 'Added to favorites' : 'Removed from favorites' });
  }, []);

  const api = useMemo<AppApi>(
    () => ({ state, dispatch, navigate, toast, start, answer, refreshExams, importExamFile, importStats, toggleFavorite }),
    [state, navigate, toast, start, answer, refreshExams, importExamFile, importStats, toggleFavorite],
  );
  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
