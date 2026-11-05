// Real exam files, used by unit tests to check logic against the actual question bank.
import exam1 from '../../Exams/CIS_DF_1_FINAL.json';
import exam2 from '../../Exams/CIS_DF_2_FINAL.json';
import exam3 from '../../Exams/CIS_DF_3_FINAL.json';
import exam4 from '../../Exams/CIS_DF_4_FINAL.json';
import exam5 from '../../Exams/CIS_DF_5_FINAL.json';
import type { ExamFile } from './types';

export const EXAM_FILES: Record<string, ExamFile> = {
  F1: exam1 as unknown as ExamFile,
  F2: exam2 as unknown as ExamFile,
  F3: exam3 as unknown as ExamFile,
  F4: exam4 as unknown as ExamFile,
  F5: exam5 as unknown as ExamFile,
};
