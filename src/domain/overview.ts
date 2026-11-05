import { DOMAINS, domainOf } from './blueprint';
import { statKey, statusOf, type QuestionStatus } from './stats';
import type { DomainKey, ExamStore, StatsState } from './types';

export interface DomainProgress {
  key: DomainKey;
  total: number;
  seen: number;
  /** Last answer correct (includes mastered). */
  correct: number;
  mastered: number;
  wrong: number;
  /** correct / total: rewards both coverage and accuracy. */
  score: number;
}

export interface Overview {
  domains: DomainProgress[];
  totals: Record<QuestionStatus, number> & { all: number };
  /** Blueprint-weighted average of domain scores, 0..1. */
  readiness: number;
  attempts: number;
  attemptsCorrect: number;
}

export function computeOverview(exams: ExamStore, stats: StatsState): Overview {
  const byDomain = new Map<DomainKey, DomainProgress>(
    DOMAINS.map((d) => [d.key, { key: d.key, total: 0, seen: 0, correct: 0, mastered: 0, wrong: 0, score: 0 }]),
  );
  const totals = { all: 0, new: 0, wrong: 0, correct: 0, mastered: 0 };
  let attempts = 0;
  let attemptsCorrect = 0;

  for (const [examId, exam] of Object.entries(exams)) {
    for (const q of exam.questions ?? []) {
      const stat = stats.q[statKey(examId, q.id)];
      const status = statusOf(stat);
      totals.all += 1;
      totals[status] += 1;
      if (stat) {
        attempts += stat.seen;
        attemptsCorrect += stat.correct;
      }
      const domain = domainOf(q);
      const d = domain ? byDomain.get(domain) : undefined;
      if (!d) continue;
      d.total += 1;
      if (status !== 'new') d.seen += 1;
      if (status === 'correct' || status === 'mastered') d.correct += 1;
      if (status === 'mastered') d.mastered += 1;
      if (status === 'wrong') d.wrong += 1;
    }
  }

  const domains = [...byDomain.values()].map((d) => ({ ...d, score: d.total ? d.correct / d.total : 0 }));
  let weighted = 0;
  let weightSum = 0;
  for (const d of domains) {
    if (!d.total) continue;
    const w = DOMAINS.find((x) => x.key === d.key)!.weight;
    weighted += w * d.score;
    weightSum += w;
  }
  return { domains, totals, readiness: weightSum ? weighted / weightSum : 0, attempts, attemptsCorrect };
}
