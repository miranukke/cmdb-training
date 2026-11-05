import { describe, expect, it } from 'vitest';
import { correctAnswerText, isAnswerCorrect, isPlayable, requiredSelections } from './scoring';
import { EXAM_FILES } from './testData';
import type { Answer, Question } from './types';

const multi: Question = {
  id: 1,
  type: 'multiple_choice',
  question: 'Pick two',
  select_count: 2,
  choices: [
    { id: 'A', text: 'a' },
    { id: 'B', text: 'b' },
    { id: 'C', text: 'c' },
  ],
  correct_answers: ['A', 'C'],
};

const match: Question = {
  id: 2,
  type: 'drag_and_drop',
  question: 'Match',
  items: [
    { id: 'i1', text: 'one' },
    { id: 'i2', text: 'two' },
    { id: 'i3', text: 'distractor' },
  ],
  targets: [
    { id: 't1', label: 'First' },
    { id: 't2', label: 'Second' },
  ],
  correct_mapping: { t1: 'i1', t2: 'i2' },
};

describe('scoring', () => {
  it('needs the exact set of choices (no partial credit)', () => {
    expect(isAnswerCorrect(multi, { kind: 'choice', selected: ['C', 'A'] })).toBe(true);
    expect(isAnswerCorrect(multi, { kind: 'choice', selected: ['A'] })).toBe(false);
    expect(isAnswerCorrect(multi, { kind: 'choice', selected: ['A', 'B', 'C'] })).toBe(false);
    expect(requiredSelections(multi)).toBe(2);
  });

  it('needs every target matched correctly', () => {
    expect(isAnswerCorrect(match, { kind: 'match', mapping: { t1: 'i1', t2: 'i2' } })).toBe(true);
    expect(isAnswerCorrect(match, { kind: 'match', mapping: { t1: 'i1', t2: 'i3' } })).toBe(false);
    expect(isAnswerCorrect(match, { kind: 'match', mapping: { t1: 'i1' } })).toBe(false);
    expect(isAnswerCorrect(match, { kind: 'choice', selected: [] })).toBe(false);
  });

  it('describes the correct answer', () => {
    expect(correctAnswerText(multi)).toEqual(['A. a', 'C. c']);
    expect(correctAnswerText(match)).toEqual(['First → one', 'Second → two']);
  });

  it('every question in the real bank is playable and its key scores as correct', () => {
    for (const [f, file] of Object.entries(EXAM_FILES)) {
      for (const q of file.questions) {
        const label = `${f}-Q${q.id}`;
        expect(isPlayable(q), label).toBe(true);
        const answer: Answer =
          q.type === 'drag_and_drop' ? { kind: 'match', mapping: { ...q.correct_mapping } } : { kind: 'choice', selected: [...(q.correct_answers ?? [])] };
        expect(isAnswerCorrect(q, answer), label).toBe(true);
        if (q.type !== 'drag_and_drop') expect(q.correct_answers!.length, label).toBe(requiredSelections(q));
      }
    }
  });
});
