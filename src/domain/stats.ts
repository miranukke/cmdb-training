import { dayKey } from '../lib/format';
import type { ExamStore, ProgressMark, QuestionStat, SessionRecord, StatsState } from './types';

export const MAX_SESSIONS = 300;
/** Correct this many times in a row and a question counts as mastered. */
export const MASTERY_STREAK = 2;

export type QuestionStatus = 'new' | 'wrong' | 'correct' | 'mastered';

export function emptyStats(): StatsState {
  return { v: 1, q: {}, sessions: [], days: {} };
}

export const statKey = (examId: string, questionId: number | string): string => `${examId}|${questionId}`;

export function statusOf(stat: QuestionStat | undefined): QuestionStatus {
  if (!stat) return 'new';
  if (stat.last === 'wrong') return 'wrong';
  return stat.streak >= MASTERY_STREAK ? 'mastered' : 'correct';
}

/** Records one answer. Returns new state (inputs are not mutated). */
export function recordAnswer(stats: StatsState, key: string, correct: boolean, now: number): StatsState {
  const prev = stats.q[key];
  const next: QuestionStat = {
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    streak: correct ? (prev?.streak ?? 0) + 1 : 0,
    last: correct ? 'correct' : 'wrong',
    at: now,
  };
  const day = dayKey(now);
  return { ...stats, q: { ...stats.q, [key]: next }, days: { ...stats.days, [day]: (stats.days[day] ?? 0) + 1 } };
}

/** Reverts one recorded answer (the "Try again" button). */
export function undoAnswer(stats: StatsState, key: string, previous: QuestionStat | undefined, answeredAt: number): StatsState {
  const q = { ...stats.q };
  if (previous) q[key] = previous;
  else delete q[key];
  const day = dayKey(answeredAt);
  const days = { ...stats.days };
  if (days[day]) {
    days[day] -= 1;
    if (days[day] <= 0) delete days[day];
  }
  return { ...stats, q, days };
}

export function addSession(stats: StatsState, session: SessionRecord): StatsState {
  return { ...stats, sessions: [...stats.sessions, session].slice(-MAX_SESSIONS) };
}

/** Drops all per-question stats for one exam (used by "Reset progress"). */
export function clearExamStats(stats: StatsState, examId: string): StatsState {
  const prefix = `${examId}|`;
  return { ...stats, q: Object.fromEntries(Object.entries(stats.q).filter(([k]) => !k.startsWith(prefix))) };
}

/**
 * The original app only stored the last result per question. Seed stats from that so
 * existing users keep their progress after the upgrade.
 */
export function migrateFromProgress(stats: StatsState, exams: ExamStore): StatsState {
  let q = stats.q;
  for (const [examId, exam] of Object.entries(exams)) {
    for (const [qid, mark] of Object.entries(exam.progress ?? {}) as [string, ProgressMark][]) {
      const key = statKey(examId, qid);
      if (q[key]) continue;
      if (q === stats.q) q = { ...stats.q };
      q[key] = { seen: 1, correct: mark === 'correct' ? 1 : 0, streak: mark === 'correct' ? 1 : 0, last: mark, at: 0 };
    }
  }
  return q === stats.q ? stats : { ...stats, q };
}

/** Consecutive days with at least one answer, counting back from today (or yesterday). */
export function currentStreak(days: Record<string, number>, now: number): number {
  const DAY = 86_400_000;
  let cursor = now;
  if (!days[dayKey(cursor)]) cursor -= DAY;
  let streak = 0;
  while (days[dayKey(cursor)]) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}
