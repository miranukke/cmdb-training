import { describe, expect, it } from 'vitest';
import { DOMAINS, classifyQuestion, domainOf } from './blueprint';
import { EXAM_FILES } from './testData';
import type { Question } from './types';

const all = Object.entries(EXAM_FILES).flatMap(([f, file]) => file.questions.map((q) => ({ f, q })));
const find = (f: string, id: number) => all.find((x) => x.f === f && x.q.id === id)!.q;

describe('blueprint', () => {
  it('weights add up to 100%', () => {
    expect(DOMAINS.reduce((s, d) => s + d.weight, 0)).toBe(100);
  });

  it('classifies every question in the real bank', () => {
    const unclassified = all.filter(({ q }) => classifyQuestion(q) === null).map(({ f, q }) => `${f}-Q${q.id}`);
    expect(unclassified).toEqual([]);
  });

  it('roughly follows the blueprint distribution', () => {
    const counts = Object.fromEntries(DOMAINS.map((d) => [d.key, 0]));
    for (const { q } of all) counts[classifyQuestion(q)!] += 1;
    for (const d of DOMAINS) {
      const share = (counts[d.key] / all.length) * 100;
      expect(Math.abs(share - d.weight), `${d.key} share ${share.toFixed(1)}%`).toBeLessThan(8);
    }
  });

  it.each([
    ['F1', 2, 'govern'], // Data Manager policy types
    ['F1', 30, 'configuration'], // reclassification
    ['F2', 36, 'ingest'], // import sets
    ['F1', 11, 'insight'], // Query Builder
    ['F1', 64, 'csdm'], // CSDM domain
    ['F1', 23, 'govern'], // principal classes (mentions "incident form")
    ['F4', 2, 'configuration'], // dynamic reconciliation (mentions SCCM)
    ['F1', 51, 'ingest'], // group sync from offerings
    ['F2', 64, 'csdm'], // "what CSDM stage"
  ] as const)('%s-Q%i → %s', (f, id, expected) => {
    expect(classifyQuestion(find(f, id))).toBe(expected);
  });

  it('prefers an explicit domain field', () => {
    const q: Question = { id: 1, type: 'single_choice', question: 'What is a Query Builder?', domain: 'csdm' };
    expect(domainOf(q)).toBe('csdm');
  });
});
