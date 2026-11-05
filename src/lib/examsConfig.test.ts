import { describe, expect, it } from 'vitest';
import { isPlayable } from '../domain/scoring';
import { loadConfiguredExams, resolveExamSource } from './examSource';

// Every JSON file in /Exams, keyed by file name (e.g. "CIS_DF_1_FINAL.json").
const files = Object.fromEntries(
  Object.entries(import.meta.glob('../../Exams/*.json', { eager: true, import: 'default' })).map(([path, data]) => [path.split('/').pop()!, data]),
);

describe('Exams/exams.config.json', () => {
  it('lists only files that exist, and every listed exam loads and is fully playable', async () => {
    // Serve the repo files through the real loader, exactly as the deployed app loads them.
    const fakeFetch = (async (input: RequestInfo | URL) => {
      const name = String(input).split('/').pop()!;
      return name in files ? new Response(JSON.stringify(files[name])) : new Response('missing', { status: 404 });
    }) as typeof fetch;

    const source = resolveExamSource();
    const res = await loadConfiguredExams(source, {}, fakeFetch);

    expect(res.failed).toEqual([]);
    const exams = Object.values(res.exams);
    expect(exams.map((e) => e.meta.title)).toEqual([
      'CIS - Data Foundations (CMDB & CSDM) - 1',
      'CIS - Data Foundations (CMDB & CSDM) - 2',
      'CIS - Data Foundations (CMDB & CSDM) - 3',
      'CIS - Data Foundations (CMDB & CSDM) - 4',
      'CIS - Data Foundations (CMDB & CSDM) - 5',
    ]);
    for (const exam of exams) {
      expect(exam.questions.every(isPlayable), exam.meta.title).toBe(true);
      expect(new Set(exam.questions.map((q) => q.id)).size, `${exam.meta.title} has duplicate question ids`).toBe(exam.questions.length);
    }
    expect(exams.reduce((n, e) => n + e.questions.length, 0)).toBe(281);
  });
});
