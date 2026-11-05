/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const EXAMS_DIR = resolve(ROOT, 'Exams');

/**
 * The exam JSON files stay in /Exams at the repo root (so raw.githubusercontent URLs and
 * web-upload editing keep working). This plugin serves them during `vite dev` and copies
 * them into the build output, so the app can also run against its bundled copies.
 */
function examsPlugin(): Plugin {
  return {
    name: 'cisdf-exams-json',
    configureServer(server) {
      server.middlewares.use('/Exams', (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0].replace(/^\/+/, ''));
        const file = resolve(EXAMS_DIR, name);
        if (!file.startsWith(EXAMS_DIR + sep) || !name.endsWith('.json') || !existsSync(file)) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      for (const name of readdirSync(EXAMS_DIR).filter((f) => f.endsWith('.json'))) {
        this.emitFile({ type: 'asset', fileName: `Exams/${name}`, source: readFileSync(resolve(EXAMS_DIR, name)) });
      }
    },
  };
}

/**
 * Emits sw.js from src/pwa/sw.template.js with a precache list of everything the app needs offline
 * (app shell, JS/CSS, public files, exams, Latin fonts) and a version derived from their content,
 * so every deploy that changes anything installs a fresh cache.
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'cisdf-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const isFont = (f: string) => /\.(woff2?|ttf)$/.test(f);
      // Other font subsets/formats are cached on first use instead of up front.
      const wantedFont = (f: string) => /\.woff2$/.test(f) && /-latin-(?!ext)/.test(f);
      const files = Object.keys(bundle)
        .filter((f) => !f.endsWith('.map') && (!isFont(f) || wantedFont(f)))
        .sort();
      const publicDir = resolve(ROOT, 'public');
      const publicFiles = existsSync(publicDir) ? readdirSync(publicDir) : [];
      const precache = ['./', ...new Set([...files, ...publicFiles, 'index.html'])].map((f) => (f === './' ? f : `./${f}`));

      const template = readFileSync(resolve(ROOT, 'src/pwa/sw.template.js'), 'utf8');
      const hash = createHash('sha256').update(template);
      for (const f of files) {
        const out = bundle[f];
        hash.update(f).update(out.type === 'chunk' ? out.code : typeof out.source === 'string' ? out.source : Buffer.from(out.source));
      }
      for (const f of publicFiles) hash.update(f).update(readFileSync(resolve(publicDir, f)));
      const version = hash.digest('hex').slice(0, 12);

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace("'__VERSION__'", JSON.stringify(version)).replace('__PRECACHE__', JSON.stringify(precache, null, 2)),
      });
    },
  };
}

export default defineConfig({
  // Relative base so the build works from any path, e.g. https://<user>.github.io/<repo>/
  base: './',
  plugins: [react(), examsPlugin(), serviceWorkerPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
