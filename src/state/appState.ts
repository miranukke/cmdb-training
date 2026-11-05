import { domainOf } from '../domain/blueprint';
import { addSession, clearExamStats, recordAnswer, statKey, undoAnswer } from '../domain/stats';
import type {
  Answer,
  DomainKey,
  Exam,
  ExamStore,
  Favorites,
  ProgressMark,
  Question,
  QuestionStat,
  QueueItem,
  SessionMode,
  SessionRecord,
  StatsState,
} from '../domain/types';

export type HomeTab = 'overview' | 'exams' | 'favorites' | 'history';

export type View =
  | { name: 'home'; tab: HomeTab }
  | { name: 'exam'; examId: string }
  | { name: 'quiz' }
  | { name: 'results' };

export interface AnswerResult {
  answer: Answer;
  correct: boolean;
  at: number;
  /** Snapshots used by "Try again" to undo the answer. */
  prevStat?: QuestionStat;
  prevMark?: ProgressMark;
}

export interface QuizSession {
  mode: SessionMode;
  title: string;
  items: QueueItem[];
  index: number;
  results: (AnswerResult | undefined)[];
  startedAt: number;
  /** Mock exam deadline (epoch ms). */
  deadline?: number;
  /** Show correctness + explanation right after answering (off in mock exams). */
  reveal: boolean;
  /** Set when the session belongs to one exam, so "back" returns to it. */
  examId?: string;
  finishedAt?: number;
}

export interface SyncState {
  status: 'idle' | 'loading' | 'done' | 'error';
  message?: string;
}

export interface AppState {
  exams: ExamStore;
  stats: StatsState;
  favorites: Favorites;
  view: View;
  session: QuizSession | null;
  sync: SyncState;
  toast: { id: number; text: string } | null;
}

export type Action =
  | { type: 'sync/started' }
  | { type: 'sync/finished'; exams: ExamStore; message: string; ok: boolean }
  | { type: 'exam/imported'; id: string; exam: Exam }
  | { type: 'exam/deleted'; id: string }
  | { type: 'exam/clearedAll' }
  | { type: 'exam/progressReset'; id: string }
  | { type: 'favorite/toggled'; examId: string; question: Question }
  | { type: 'navigate'; view: View }
  | { type: 'session/started'; session: QuizSession }
  | { type: 'session/answered'; answer: Answer; correct: boolean; now: number }
  | { type: 'session/undone' }
  | { type: 'session/moved'; index: number }
  | { type: 'session/finished'; now: number }
  | { type: 'session/abandoned'; now: number }
  | { type: 'stats/replaced'; stats: StatsState }
  | { type: 'toast'; text: string };

export const favoriteKey = (examId: string, qid: number) => `${examId}_${qid}`;

function setMark(exams: ExamStore, examId: string, qid: number, mark: ProgressMark | undefined): ExamStore {
  const exam = exams[examId];
  if (!exam) return exams;
  const progress = { ...exam.progress };
  if (mark) progress[qid] = mark;
  else delete progress[qid];
  return { ...exams, [examId]: { ...exam, progress } };
}

export function summarizeSession(s: QuizSession, now: number): SessionRecord {
  const byDomain: SessionRecord['byDomain'] = {};
  let total = 0;
  let correct = 0;
  s.items.forEach((item, i) => {
    const r = s.results[i];
    if (!r) return;
    total += 1;
    if (r.correct) correct += 1;
    const d: DomainKey | null = domainOf(item.q);
    if (d) {
      const [c, t] = byDomain[d] ?? [0, 0];
      byDomain[d] = [c + (r.correct ? 1 : 0), t + 1];
    }
  });
  return { at: s.startedAt, durationSec: Math.round((now - s.startedAt) / 1000), mode: s.mode, title: s.title, total, correct, byDomain };
}

const answeredCount = (s: QuizSession) => s.results.filter(Boolean).length;

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'sync/started':
      return { ...state, sync: { status: 'loading', message: 'Loading exams…' } };

    case 'sync/finished': {
      // Keep progress recorded while the fetch was in flight.
      const exams = { ...state.exams };
      for (const [id, exam] of Object.entries(action.exams)) {
        exams[id] = { ...exam, progress: state.exams[id]?.progress ?? exam.progress };
      }
      return { ...state, exams, sync: { status: action.ok ? 'done' : 'error', message: action.message } };
    }

    case 'exam/imported':
      return { ...state, exams: { ...state.exams, [action.id]: action.exam } };

    case 'exam/deleted': {
      const exams = { ...state.exams };
      delete exams[action.id];
      return { ...state, exams, stats: clearExamStats(state.stats, action.id) };
    }

    case 'exam/clearedAll':
      return { ...state, exams: {}, stats: { ...state.stats, q: {} } };

    case 'exam/progressReset': {
      const exam = state.exams[action.id];
      if (!exam) return state;
      return {
        ...state,
        exams: { ...state.exams, [action.id]: { ...exam, progress: {} } },
        stats: clearExamStats(state.stats, action.id),
      };
    }

    case 'favorite/toggled': {
      const key = favoriteKey(action.examId, action.question.id);
      const favorites = { ...state.favorites };
      if (favorites[key]) delete favorites[key];
      else {
        favorites[key] = {
          examId: action.examId,
          examTitle: state.exams[action.examId]?.meta.title ?? action.examId,
          question: action.question,
        };
      }
      return { ...state, favorites };
    }

    case 'navigate':
      return { ...state, view: action.view };

    case 'session/started':
      return { ...state, session: action.session, view: { name: 'quiz' } };

    case 'session/answered': {
      const s = state.session;
      if (!s || s.results[s.index]) return state;
      const { examId, q } = s.items[s.index];
      const key = statKey(examId, q.id);
      const result: AnswerResult = {
        answer: action.answer,
        correct: action.correct,
        at: action.now,
        prevStat: state.stats.q[key],
        prevMark: state.exams[examId]?.progress[q.id],
      };
      const results = [...s.results];
      results[s.index] = result;
      return {
        ...state,
        session: { ...s, results },
        stats: recordAnswer(state.stats, key, action.correct, action.now),
        exams: setMark(state.exams, examId, q.id, action.correct ? 'correct' : 'wrong'),
      };
    }

    case 'session/undone': {
      const s = state.session;
      const r = s?.results[s.index];
      if (!s || !r) return state;
      const { examId, q } = s.items[s.index];
      const results = [...s.results];
      results[s.index] = undefined;
      return {
        ...state,
        session: { ...s, results },
        stats: undoAnswer(state.stats, statKey(examId, q.id), r.prevStat, r.at),
        exams: setMark(state.exams, examId, q.id, r.prevMark),
      };
    }

    case 'session/moved':
      return state.session ? { ...state, session: { ...state.session, index: action.index } } : state;

    case 'session/finished': {
      const s = state.session;
      if (!s) return state;
      const stats = answeredCount(s) ? addSession(state.stats, summarizeSession(s, action.now)) : state.stats;
      return { ...state, stats, session: { ...s, finishedAt: action.now }, view: { name: 'results' } };
    }

    case 'session/abandoned': {
      const s = state.session;
      if (!s) return state;
      // Partial sessions still count toward history.
      const stats = answeredCount(s) ? addSession(state.stats, summarizeSession(s, action.now)) : state.stats;
      const view: View = s.examId && state.exams[s.examId] ? { name: 'exam', examId: s.examId } : { name: 'home', tab: 'overview' };
      return { ...state, stats, session: null, view };
    }

    case 'stats/replaced':
      return { ...state, stats: action.stats };

    case 'toast':
      return { ...state, toast: { id: (state.toast?.id ?? 0) + 1, text: action.text } };
  }
}
