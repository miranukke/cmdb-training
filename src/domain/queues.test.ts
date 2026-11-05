import { describe, expect, it } from 'vitest';
import { DOMAINS, EXAM_QUESTION_COUNT, domainOf } from './blueprint';
import { computeOverview } from './overview';
import { allItems, dedupe, examQueue, mistakesQueue, mockExamQueue, reviewQueue } from './queues';
import { emptyStats, recordAnswer, statKey } from './stats';
import { EXAM_FILES } from './testData';
import type { ExamStore } from './types';

const exams: ExamStore = Object.fromEntries(
  Object.entries(EXAM_FILES).map(([id, file]) => [id, { meta: { title: id, total: file.questions.length }, questions: file.questions, progress: {} }]),
);

// Deterministic RNG for reproducible shuffles.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const NOW = new Date(2026, 10, 5, 12).getTime();
const DAY = 86_400_000;

describe('queues', () => {
  it('removes duplicate questions across exam files', () => {
    const items = allItems(exams);
    const unique = dedupe(items);
    expect(items.length).toBe(281);
    expect(unique.length).toBeLessThan(items.length);
    expect(unique.length).toBeGreaterThan(150);
  });

  it('builds a 75-question mock exam with distinct questions split by blueprint weight', () => {
    const mock = mockExamQueue(exams, seeded(42));
    expect(mock).toHaveLength(EXAM_QUESTION_COUNT);
    expect(new Set(mock.map((m) => m.q.question)).size).toBe(EXAM_QUESTION_COUNT);
    for (const d of DOMAINS) {
      const n = mock.filter((m) => domainOf(m.q) === d.key).length;
      expect(Math.abs(n - Math.round((EXAM_QUESTION_COUNT * d.weight) / 100)), d.key).toBeLessThanOrEqual(3);
    }
  });

  it('filters an exam by status', () => {
    let stats = emptyStats();
    stats = recordAnswer(stats, statKey('F1', 1), true, NOW);
    stats = recordAnswer(stats, statKey('F1', 2), false, NOW);
    expect(examQueue('F1', exams.F1, stats, 'all')).toHaveLength(75);
    expect(examQueue('F1', exams.F1, stats, 'correct').map((i) => i.q.id)).toEqual([1]);
    expect(examQueue('F1', exams.F1, stats, 'wrong').map((i) => i.q.id)).toEqual([2]);
    expect(examQueue('F1', exams.F1, stats, 'new')).toHaveLength(73);
    expect(examQueue('F1', exams.F1, stats, 'not-correct')).toHaveLength(74);
  });

  it('puts wrong answers first in review, then stale unmastered ones', () => {
    let stats = emptyStats();
    stats = recordAnswer(stats, statKey('F1', 1), true, NOW - 3 * DAY); // correct, not mastered, old → tier 2
    stats = recordAnswer(stats, statKey('F1', 2), false, NOW - DAY); // wrong → tier 3
    stats = recordAnswer(stats, statKey('F1', 3), true, NOW - 60_000); // just answered → not due
    const queue = reviewQueue(exams, stats, NOW);
    expect(queue.map((i) => i.q.id)).toEqual([2, 1]);
    expect(mistakesQueue(exams, stats).map((i) => i.q.id)).toEqual([2]);
  });

  it('weights readiness by the blueprint', () => {
    let stats = emptyStats();
    const govern = allItems(exams).filter(({ q }) => domainOf(q) === 'govern');
    for (const { examId, q } of govern) stats = recordAnswer(stats, statKey(examId, q.id), true, NOW);
    const ov = computeOverview(exams, stats);
    const g = ov.domains.find((d) => d.key === 'govern')!;
    expect(g.score).toBe(1);
    expect(ov.readiness).toBeCloseTo(0.35, 5); // only Govern (35% weight) is complete
    expect(ov.totals.correct).toBe(govern.length);
  });
});
