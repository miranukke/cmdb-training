import { DOMAIN_BY_KEY, EXAM_DURATION_MIN } from '../domain/blueprint';
import { domainQueue, examQueue, mistakesQueue, mockExamQueue, reviewQueue, shuffle, type ExamFilter } from '../domain/queues';
import { isPlayable } from '../domain/scoring';
import type { DomainKey, ExamStore, Favorites, QueueItem, SessionMode, StatsState } from '../domain/types';
import type { QuizSession } from './appState';

interface SessionInit {
  mode: SessionMode;
  title: string;
  items: QueueItem[];
  now: number;
  examId?: string;
  reveal?: boolean;
  durationMin?: number;
}

export function makeSession({ mode, title, items, now, examId, reveal = true, durationMin }: SessionInit): QuizSession {
  return {
    mode,
    title,
    items,
    index: 0,
    results: new Array(items.length).fill(undefined),
    startedAt: now,
    deadline: durationMin ? now + durationMin * 60_000 : undefined,
    reveal,
    examId,
  };
}

// Builders return null when there is nothing to practise, so callers can show a toast instead.

export function examSession(exams: ExamStore, stats: StatsState, examId: string, filter: ExamFilter, random: boolean, now: number) {
  const exam = exams[examId];
  if (!exam) return null;
  let items = examQueue(examId, exam, stats, filter);
  if (random) items = shuffle(items);
  return items.length ? makeSession({ mode: 'exam', title: exam.meta.title, items, now, examId }) : null;
}

export function singleQuestionSession(exams: ExamStore, examId: string, questionId: number, now: number) {
  const q = exams[examId]?.questions.find((x) => x.id === questionId);
  if (!q || !isPlayable(q)) return null;
  return makeSession({ mode: 'single', title: exams[examId].meta.title, items: [{ examId, q }], now, examId });
}

export function domainSession(exams: ExamStore, domain: DomainKey, now: number) {
  const items = shuffle(domainQueue(exams, domain));
  return items.length ? makeSession({ mode: 'domain', title: `${DOMAIN_BY_KEY[domain].label} drill`, items, now }) : null;
}

export function reviewSession(exams: ExamStore, stats: StatsState, now: number) {
  const items = reviewQueue(exams, stats, now);
  return items.length ? makeSession({ mode: 'review', title: 'Smart review', items, now }) : null;
}

export function mistakesSession(exams: ExamStore, stats: StatsState, now: number) {
  const items = shuffle(mistakesQueue(exams, stats));
  return items.length ? makeSession({ mode: 'mistakes', title: 'Mistakes', items, now }) : null;
}

export function mockSession(exams: ExamStore, now: number) {
  const items = mockExamQueue(exams);
  return items.length
    ? makeSession({ mode: 'mock', title: 'Mock exam', items, now, reveal: false, durationMin: EXAM_DURATION_MIN })
    : null;
}

export function favoritesSession(exams: ExamStore, favorites: Favorites, now: number) {
  // Prefer the live question (it may have been corrected since it was starred).
  const items = Object.values(favorites)
    .map(({ examId, question }) => ({ examId, q: exams[examId]?.questions.find((x) => x.id === question.id) ?? question }))
    .filter(({ q }) => isPlayable(q));
  return items.length ? makeSession({ mode: 'favorites', title: 'Favorites', items: shuffle(items), now }) : null;
}

export function retrySession(previous: QuizSession, now: number) {
  const items = previous.items.filter((_, i) => !previous.results[i]?.correct);
  return items.length
    ? makeSession({ mode: 'retry', title: `Retry: ${previous.title}`, items: shuffle(items), now, examId: previous.examId })
    : null;
}
