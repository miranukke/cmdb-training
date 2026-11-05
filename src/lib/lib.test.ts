import { describe, expect, it } from 'vitest';
import type { ExamStore } from '../domain/types';
import { loadConfiguredExams, remoteExamId, resolveExamSource } from './examSource';
import { formatClock } from './format';
import { linkParts, splitExplanation } from './text';

describe('text', () => {
  it('splits sources from the explanation body', () => {
    const { body, sources } = splitExplanation('Use X. Source: https://a.example/x.html; ServiceNow course');
    expect(body).toBe('Use X.');
    expect(sources).toEqual(['https://a.example/x.html', 'ServiceNow course']);
    expect(splitExplanation(undefined)).toEqual({ body: '', sources: [] });
  });

  it('turns URLs into link parts without trailing punctuation', () => {
    const parts = linkParts('See https://www.servicenow.com/docs/r/cmdb/cmdb-groups.html.');
    expect(parts).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'link', href: 'https://www.servicenow.com/docs/r/cmdb/cmdb-groups.html', label: 'servicenow.com › cmdb-groups' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('formats clocks', () => {
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(90 * 60)).toBe('1:30:00');
  });
});

describe('exam source', () => {
  it('keeps the original exam ID hash (so stored progress still matches)', () => {
    const url = 'https://raw.githubusercontent.com/farnous/snowtest/main/Exams/CIS_DF_1_FINAL.json';
    let h = 0;
    for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
    expect(remoteExamId(url)).toBe('remote_' + Math.abs(h).toString(36));
  });

  it('loads the exams deployed with the site, unless a config URL is set at build time', () => {
    const site = resolveExamSource();
    expect(site.configUrl).toBe('Exams/exams.config.json');
    expect(site.resolve('https://raw.githubusercontent.com/x/y/main/Exams/A.json')).toBe('Exams/A.json');
    const custom = resolveExamSource({ envConfigUrl: 'https://cfg' });
    expect(custom.configUrl).toBe('https://cfg');
    expect(custom.resolve('https://x/A.json')).toBe('https://x/A.json');
  });

  it('re-fetches exams, keeps progress, and falls back to the cache on failure', async () => {
    const urlA = 'https://host/Exams/A.json';
    const urlB = 'https://host/Exams/B.json';
    const idA = remoteExamId(urlA);
    const idB = remoteExamId(urlB);
    const existing: ExamStore = {
      [idA]: { meta: { title: 'A', total: 1 }, questions: [{ id: 1, type: 'single_choice', question: 'old' }], progress: { '1': 'correct' } },
      [idB]: { meta: { title: 'B', total: 1 }, questions: [{ id: 1, type: 'single_choice', question: 'cached' }], progress: {} },
    };
    const files: Record<string, unknown> = {
      cfg: { exams: [{ url: urlA }, { url: urlB, title: 'B' }] },
      [urlA]: { exam_metadata: { title: 'A v2' }, questions: [{ id: 1, type: 'single_choice', question: 'new' }] },
    };
    const fakeFetch = (async (input: RequestInfo | URL) => {
      const body = files[String(input)];
      return body ? new Response(JSON.stringify(body)) : new Response('nope', { status: 404 });
    }) as typeof fetch;

    const res = await loadConfiguredExams({ configUrl: 'cfg', resolve: (u) => u, label: 't' }, existing, fakeFetch);
    expect(res.loaded).toBe(1);
    expect(res.updated).toBe(1);
    expect(res.failed).toEqual(['B']);
    expect(res.exams[idA].questions[0].question).toBe('new');
    expect(res.exams[idA].progress).toEqual({ '1': 'correct' });
    expect(res.exams[idB].questions[0].question).toBe('cached');
  });
});
