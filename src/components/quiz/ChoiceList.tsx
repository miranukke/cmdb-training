import { IconArrowRight, IconCheck, IconX } from '@tabler/icons-react';
import type { Question } from '../../domain/types';
import styles from './quiz.module.css';

interface Props {
  q: Question;
  selected: string[];
  onToggle: (id: string) => void;
  locked: boolean;
  /** Mark correct / wrong / missed choices (after answering, in practice modes). */
  reveal: boolean;
}

export function ChoiceList({ q, selected, onToggle, locked, reveal }: Props) {
  const correct = new Set(q.correct_answers ?? []);
  const multi = q.type === 'multiple_choice';
  return (
    <ol className={styles.choices} role={multi ? 'group' : 'radiogroup'} aria-label="Answer options">
      {(q.choices ?? []).map((c) => {
        const isSel = selected.includes(c.id);
        let state = '';
        if (reveal) {
          if (correct.has(c.id) && isSel) state = styles.cCorrect;
          else if (isSel) state = styles.cWrong;
          else if (correct.has(c.id)) state = styles.cMissed;
        }
        return (
          <li key={c.id}>
            <button
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={isSel}
              disabled={locked}
              className={`${styles.choice} ${isSel ? styles.cSelected : ''} ${state}`}
              onClick={() => onToggle(c.id)}
            >
              <kbd className={styles.key}>{c.id}</kbd>
              <span className={styles.choiceText}>{c.text}</span>
              {reveal && state === styles.cCorrect && <IconCheck className={styles.mark} size={18} aria-label="correct" />}
              {reveal && state === styles.cWrong && <IconX className={styles.mark} size={18} aria-label="wrong" />}
              {reveal && state === styles.cMissed && <IconArrowRight className={styles.mark} size={18} aria-label="correct answer you missed" />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
