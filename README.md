# CIS-DF Trainer

Practice quiz and progress tracker for the ServiceNow **Certified Implementation Specialist – Data Foundations (CMDB & CSDM)** exam.

- **Exam readiness ring**: one arc per blueprint domain, sized by its exam weight (Configuration 15 · Ingest 19 · Govern 35 · Insight 20 · CSDM 11), filled by how many of that domain's questions you currently answer correctly.
- **Progress tracking**: per-question history (seen / correct / streak; two correct in a row = *mastered*), daily activity heatmap and streak, session history with score trend against the 70% target, export/restore of progress.
- **Practice modes**: per exam (all / not yet correct / wrong / new, in order or shuffled), single question from the question map, domain drill, smart review (mistakes first, then unmastered questions), fix mistakes, favorites, and a **mock exam** (75 distinct questions weighted like the blueprint, 90-minute timer, results at the end).
- Keyboard: `A–E`/`1–9` select · `Enter` check/next · `←/→` move · `F` favorite · `Esc` exit. Drag-and-drop questions also work by tapping an item, then a target (touch screens).
- Light/dark theme (follows the OS, toggle in the header).

## Project structure

```
Exams/                     Exam JSON files + exams.config.json (unchanged location; edit/upload as before)
index.html                 Vite entry
src/
  main.tsx, App.tsx        Bootstrap and screen switch
  domain/                  Pure, unit-tested logic (no React)
    types.ts               Exam/question/stats types
    blueprint.ts           Blueprint domains + weights, keyword classifier (question → domain)
    scoring.ts             All-or-nothing answer scoring, answer text for review
    stats.ts               Per-question stats, mastery, streaks, migration from the old app
    overview.ts            Domain progress and weighted readiness
    queues.ts              Filters, de-duplication, smart review, mock exam builder
  lib/                     Browser-facing helpers
    examSource.ts          Loads exams (always re-fetches; falls back to cache)
    storage.ts             localStorage access (keys compatible with the original app)
    text.ts, format.ts     Explanation/source parsing, links, dates
  state/                   App state: reducer (appState.ts), context + actions (AppContext.tsx), session builders
  hooks/                   useTheme, useHotkeys, useNow
  components/              charts/ (ring, bars, heatmap, trend, tile map), quiz/, common/, layout/
  screens/                 home/ (Overview, Exams, Favorites, History), ExamScreen, QuizScreen, ResultsScreen
  styles/                  Design tokens (light/dark) and global styles
```

## Development

```bash
npm install
npm run dev        # http://localhost:5173 (uses the local /Exams files)
npm test           # unit tests, including checks that every question in /Exams is playable and its key scores correctly
npm run build      # type-check + production build into dist/ (copies /Exams too)
```

On Windows, if the browser can't reach `localhost:5173`, run `npm run dev -- --host 127.0.0.1`.

## Where exams come from

| Situation | Source |
|---|---|
| `npm run dev`, or `?source=local` in the URL | Bundled copies of `/Exams` |
| `VITE_EXAMS_CONFIG_URL` set at build time | That config URL |
| Default (production) | `Exams/exams.config.json` on GitHub (raw), same as the original app |

Exam IDs are derived from the URL in the config exactly as before, so progress saved by the original app carries over. Exams are re-downloaded on every visit, so answer-key fixes reach everyone.

To make an exam available, add it to `Exams/exams.config.json`.

### Question format

Each file in `/Exams` is `{ "exam_metadata": { "title": … }, "questions": [ … ] }`. A question has `id`, `type` (`single_choice` | `multiple_choice` | `drag_and_drop`), `question`, and either `choices` + `correct_answers` (+ `select_count`) or `items` + `targets` + `correct_mapping`. Optional: `explanation` (end it with `Source: <url>; <url>` to show source chips), `data_table`, `note`, `tags`, and `domain` (`configuration` | `ingest` | `govern` | `insight` | `csdm`) to override the automatic blueprint classification.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` runs the tests and builds on every push and PR, and deploys `dist/` to GitHub Pages on pushes to `main`.

**One-time setup:** repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. (Serving straight from the branch no longer works, because `index.html` is now the Vite source entry.)

The previous single-file app is in git history; `exam_quiz.html` is the older standalone version and is not used by the build.
