// Shapes of the exam JSON files in /Exams and of everything the app persists.

export type QuestionType = 'single_choice' | 'multiple_choice' | 'drag_and_drop';

export interface Choice {
  id: string;
  text: string;
}

export interface DragItem {
  id: string;
  text: string;
}

export interface DragTarget {
  id: string;
  label: string;
}

export interface DataTable {
  headers: string[];
  rows: string[][];
}

export interface Question {
  id: number;
  type: QuestionType;
  question: string;
  choices?: Choice[];
  correct_answers?: string[];
  select_count?: number;
  items?: DragItem[];
  targets?: DragTarget[];
  correct_mapping?: Record<string, string>;
  explanation?: string;
  answer_source?: string;
  note?: string;
  tags?: string[];
  data_table?: DataTable;
  /** Optional explicit blueprint domain; otherwise it is inferred (see blueprint.ts). */
  domain?: string;
}

export interface ExamFile {
  exam_metadata?: { title?: string; [key: string]: unknown };
  questions: Question[];
}

export type ProgressMark = 'correct' | 'wrong';

export interface ExamMeta {
  title: string;
  total: number;
  remote?: boolean;
  url?: string;
}

/** One exam as cached in localStorage (format kept compatible with the original app). */
export interface Exam {
  meta: ExamMeta;
  questions: Question[];
  progress: Record<string, ProgressMark>;
}

export type ExamStore = Record<string, Exam>;

export type Answer =
  | { kind: 'choice'; selected: string[] }
  | { kind: 'match'; mapping: Record<string, string> };

export interface QuestionStat {
  seen: number;
  correct: number;
  /** Consecutive correct answers; 2+ counts as "mastered". */
  streak: number;
  last: ProgressMark;
  /** Epoch ms of the last answer (0 when migrated from the old format). */
  at: number;
}

export type SessionMode = 'exam' | 'single' | 'favorites' | 'domain' | 'review' | 'mistakes' | 'mock' | 'retry';

export type DomainKey = 'configuration' | 'ingest' | 'govern' | 'insight' | 'csdm';

export interface SessionRecord {
  at: number;
  durationSec: number;
  mode: SessionMode;
  title: string;
  total: number;
  correct: number;
  byDomain: Partial<Record<DomainKey, [correct: number, total: number]>>;
}

export interface StatsState {
  v: 1;
  /** Keyed by `${examId}|${questionId}`. */
  q: Record<string, QuestionStat>;
  sessions: SessionRecord[];
  /** Answers per local calendar day, keyed YYYY-MM-DD. */
  days: Record<string, number>;
}

export interface Favorite {
  examId: string;
  examTitle: string;
  /** Snapshot kept for exams that were removed; live data is preferred when available. */
  question: Question;
}

export type Favorites = Record<string, Favorite>;

export interface QueueItem {
  examId: string;
  q: Question;
}
