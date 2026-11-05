import type { Answer, Question } from './types';

export function requiredSelections(q: Question): number {
  return q.type === 'multiple_choice' ? q.select_count ?? 2 : 1;
}

/** Whether a question has the data needed to be answered and scored. */
export function isPlayable(q: Question): boolean {
  if (q.type === 'drag_and_drop') {
    return Boolean(q.items?.length && q.targets?.length && q.correct_mapping && Object.keys(q.correct_mapping).length);
  }
  return Boolean(q.choices?.length && q.correct_answers?.length);
}

/** All-or-nothing scoring, like the real exam (no partial credit). */
export function isAnswerCorrect(q: Question, answer: Answer): boolean {
  if (q.type === 'drag_and_drop') {
    if (answer.kind !== 'match') return false;
    const expected = q.correct_mapping ?? {};
    const targets = q.targets ?? [];
    return targets.length > 0 && targets.every((t) => answer.mapping[t.id] === expected[t.id]);
  }
  if (answer.kind !== 'choice') return false;
  const expected = new Set(q.correct_answers ?? []);
  const given = new Set(answer.selected);
  return expected.size > 0 && given.size === expected.size && [...given].every((id) => expected.has(id));
}

/** Human-readable correct answer, used in mock-exam review. */
export function correctAnswerText(q: Question): string[] {
  if (q.type === 'drag_and_drop') {
    const items = new Map((q.items ?? []).map((i) => [i.id, i.text]));
    return (q.targets ?? []).map((t) => `${t.label} → ${items.get(q.correct_mapping?.[t.id] ?? '') ?? '?'}`);
  }
  const choices = new Map((q.choices ?? []).map((c) => [c.id, c.text]));
  return (q.correct_answers ?? []).map((id) => `${id}. ${choices.get(id) ?? '?'}`);
}

export function givenAnswerText(q: Question, answer: Answer | undefined): string[] {
  if (!answer) return ['(not answered)'];
  if (answer.kind === 'match') {
    const items = new Map((q.items ?? []).map((i) => [i.id, i.text]));
    return (q.targets ?? []).map((t) => `${t.label} → ${items.get(answer.mapping[t.id] ?? '') ?? '—'}`);
  }
  const choices = new Map((q.choices ?? []).map((c) => [c.id, c.text]));
  return answer.selected.length ? answer.selected.map((id) => `${id}. ${choices.get(id) ?? '?'}`) : ['(nothing selected)'];
}
