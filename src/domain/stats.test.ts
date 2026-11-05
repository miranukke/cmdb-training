import { describe, expect, it } from 'vitest';
import { currentStreak, emptyStats, migrateFromProgress, recordAnswer, statKey, statusOf, undoAnswer } from './stats';
import type { ExamStore } from './types';

const T0 = new Date(2026, 10, 5, 12).getTime();
const DAY = 86_400_000;

describe('stats', () => {
  it('tracks streaks and mastery', () => {
    const k = statKey('ex', 7);
    let s = recordAnswer(emptyStats(), k, true, T0);
    expect(statusOf(s.q[k])).toBe('correct');
    s = recordAnswer(s, k, true, T0 + 1);
    expect(statusOf(s.q[k])).toBe('mastered');
    s = recordAnswer(s, k, false, T0 + 2);
    expect(s.q[k]).toMatchObject({ seen: 3, correct: 2, streak: 0, last: 'wrong' });
    expect(statusOf(s.q[k])).toBe('wrong');
    expect(s.days['2026-11-05']).toBe(3);
  });

  it('undo restores the previous stat and day count', () => {
    const k = statKey('ex', 1);
    const s1 = recordAnswer(emptyStats(), k, true, T0);
    const s2 = recordAnswer(s1, k, false, T0 + 5);
    const back = undoAnswer(s2, k, s1.q[k], T0 + 5);
    expect(back.q[k]).toEqual(s1.q[k]);
    expect(back.days['2026-11-05']).toBe(1);
    const gone = undoAnswer(s1, k, undefined, T0);
    expect(gone.q[k]).toBeUndefined();
    expect(gone.days['2026-11-05']).toBeUndefined();
  });

  it('does not mutate its input', () => {
    const s = emptyStats();
    recordAnswer(s, 'a|1', true, T0);
    expect(s).toEqual(emptyStats());
  });

  it('migrates progress from the original app format', () => {
    const exams = {
      ex: { meta: { title: 'x', total: 2 }, questions: [], progress: { '1': 'correct', '2': 'wrong' } },
    } as ExamStore;
    const s = migrateFromProgress(emptyStats(), exams);
    expect(s.q['ex|1']).toMatchObject({ last: 'correct', streak: 1 });
    expect(s.q['ex|2']).toMatchObject({ last: 'wrong', streak: 0 });
    expect(migrateFromProgress(s, exams)).toBe(s); // idempotent, no new object
  });

  it('counts the daily streak from today or yesterday', () => {
    const days = { '2026-11-03': 4, '2026-11-04': 2, '2026-11-05': 1 };
    expect(currentStreak(days, T0)).toBe(3);
    expect(currentStreak({ '2026-11-04': 2, '2026-11-03': 1 }, T0)).toBe(2);
    expect(currentStreak({ '2026-11-02': 2 }, T0)).toBe(0);
    expect(currentStreak({}, T0 - DAY)).toBe(0);
  });
});
