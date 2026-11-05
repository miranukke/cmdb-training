/// <reference types="vitest/config" />
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

export default defineConfig({
  // Relative base so the build works from any path, e.g. https://<user>.github.io/snowtest/
  base: './',
  plugins: [react(), examsPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
