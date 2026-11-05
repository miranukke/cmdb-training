import { DOMAINS, EXAM_QUESTION_COUNT, domainOf } from './blueprint';
import { isPlayable } from './scoring';
import { MASTERY_STREAK, statKey } from './stats';
import type { DomainKey, Exam, ExamStore, QueueItem, StatsState } from './types';

export type ExamFilter = 'all' | 'not-correct' | 'wrong' | 'correct' | 'new';
export type Rng = () => number;

export function shuffle<T>(list: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function allItems(exams: ExamStore): QueueItem[] {
  return Object.entries(exams).flatMap(([examId, exam]) =>
    (exam.questions ?? []).filter(isPlayable).map((q) => ({ examId, q })),
  );
}

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The exam files overlap heavily; keep the first copy of each distinct question. */
export function dedupe(items: readonly QueueItem[]): QueueItem[] {
  const seen = new Set<string>();
  return items.filter(({ q }) => {
    const key = `${q.type}:${normalize(q.question)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function examQueue(examId: string, exam: Exam, stats: StatsState, filter: ExamFilter): QueueItem[] {
  return (exam.questions ?? []).filter(isPlayable).filter((q) => {
    const s = stats.q[statKey(examId, q.id)];
    switch (filter) {
      case 'all':
        return true;
      case 'new':
        return !s;
      case 'wrong':
        return s?.last === 'wrong';
      case 'correct':
        return s?.last === 'correct';
      case 'not-correct':
        return s?.last !== 'correct';
    }
  }).map((q) => ({ examId, q }));
}

export function domainQueue(exams: ExamStore, domain: DomainKey): QueueItem[] {
  return dedupe(allItems(exams)).filter(({ q }) => domainOf(q) === domain);
}

export function mistakesQueue(exams: ExamStore, stats: StatsState): QueueItem[] {
  return dedupe(allItems(exams)).filter(({ examId, q }) => stats.q[statKey(examId, q.id)]?.last === 'wrong');
}

const DAY = 86_400_000;

/**
 * Spaced-repetition-lite review queue:
 *  1. answered wrong last time (oldest first),
 *  2. correct but not yet mastered and not seen for a day,
 *  3. mastered but not seen for two weeks.
 */
export function reviewQueue(exams: ExamStore, stats: StatsState, now: number, limit = 25): QueueItem[] {
  const scored: { item: QueueItem; tier: number; at: number }[] = [];
  for (const item of dedupe(allItems(exams))) {
    const s = stats.q[statKey(item.examId, item.q.id)];
    if (!s) continue;
    const age = now - s.at;
    let tier = 0;
    if (s.last === 'wrong') tier = 3;
    else if (s.streak < MASTERY_STREAK && age > DAY) tier = 2;
    else if (age > 14 * DAY) tier = 1;
    if (tier) scored.push({ item, tier, at: s.at });
  }
  scored.sort((a, b) => b.tier - a.tier || a.at - b.at);
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Mock exam: EXAM_QUESTION_COUNT distinct questions, split across domains by blueprint weight.
 * If a domain is short of questions the remainder is filled from the rest of the pool.
 */
export function mockExamQueue(exams: ExamStore, rng: Rng = Math.random, count = EXAM_QUESTION_COUNT): QueueItem[] {
  const pool = shuffle(dedupe(allItems(exams)), rng);
  const picked: QueueItem[] = [];
  const used = new Set<QueueItem>();
  for (const d of DOMAINS) {
    const want = Math.round((count * d.weight) / 100);
    for (const item of pool) {
      if (picked.length >= count) break;
      if (picked.filter((p) => domainOf(p.q) === d.key).length >= want) break;
      if (!used.has(item) && domainOf(item.q) === d.key) {
        picked.push(item);
        used.add(item);
      }
    }
  }
  for (const item of pool) {
    if (picked.length >= count) break;
    if (!used.has(item)) {
      picked.push(item);
      used.add(item);
    }
  }
  return shuffle(picked, rng);
}
