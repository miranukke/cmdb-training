import type { Exam, ExamFile, ExamStore } from '../domain/types';

export interface ExamSource {
  configUrl: string;
  /** Maps a URL from the config to the URL actually fetched. */
  resolve: (url: string) => string;
  label: string;
}

/**
 * Where exams come from:
 *  - VITE_EXAMS_CONFIG_URL, if set at build time (URLs in that config are fetched as-is), else
 *  - the /Exams files deployed with this build (dev server, GitHub Pages, any fork). The config's
 *    URLs are mapped to those local copies by file name, so exam IDs, which are derived from the
 *    config URLs, stay the same as in the original app and saved progress still matches.
 */
export function resolveExamSource(opts: { envConfigUrl?: string } = {}): ExamSource {
  if (opts.envConfigUrl) return { configUrl: opts.envConfigUrl, resolve: (u) => u, label: 'configured source' };
  return { configUrl: 'Exams/exams.config.json', resolve: (u) => `Exams/${u.split('/').pop()}`, label: 'this site' };
}

/** Stable ID per exam URL; identical to the original app so stored progress still matches. */
export function remoteExamId(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  return 'remote_' + Math.abs(h).toString(36);
}

export function parseExamFile(data: unknown): ExamFile {
  if (!data || typeof data !== 'object' || !Array.isArray((data as ExamFile).questions)) {
    throw new Error('Not an exam file: expected a "questions" array');
  }
  return data as ExamFile;
}

export interface LoadResult {
  exams: ExamStore;
  loaded: number;
  updated: number;
  failed: string[];
}

interface ConfigEntry {
  url: string;
  title?: string;
}

/**
 * Fetches every exam in the config. Always re-fetches (the old app cached forever, so answer-key
 * fixes never reached existing users); falls back to the cached copy when a fetch fails.
 * Progress is preserved because it is keyed by exam ID + question ID.
 */
export async function loadConfiguredExams(source: ExamSource, existing: ExamStore, fetchImpl: typeof fetch = fetch): Promise<LoadResult> {
  const cfgRes = await fetchImpl(source.configUrl, { cache: 'no-cache' });
  if (!cfgRes.ok) throw new Error(`Exam config request failed (${cfgRes.status})`);
  const cfg = (await cfgRes.json()) as { exams?: (string | ConfigEntry)[] };
  if (!Array.isArray(cfg.exams)) throw new Error('Exam config must contain an "exams" array');

  const exams: ExamStore = { ...existing };
  let loaded = 0;
  let updated = 0;
  const failed: string[] = [];

  await Promise.all(
    cfg.exams.map(async (entry) => {
      const { url, title } = typeof entry === 'string' ? { url: entry, title: undefined } : entry;
      if (!url) return;
      const id = remoteExamId(url);
      try {
        const res = await fetchImpl(source.resolve(url), { cache: 'no-cache' });
        if (!res.ok) throw new Error(String(res.status));
        const file = parseExamFile(await res.json());
        const prev = existing[id];
        const exam: Exam = {
          meta: {
            title: file.exam_metadata?.title || title || url.split('/').pop() || id,
            total: file.questions.length,
            remote: true,
            url,
          },
          questions: file.questions,
          progress: prev?.progress ?? {},
        };
        if (prev && JSON.stringify(prev.questions) !== JSON.stringify(file.questions)) updated += 1;
        exams[id] = exam;
        loaded += 1;
      } catch {
        failed.push(title ?? url);
      }
    }),
  );
  return { exams, loaded, updated, failed };
}
