import type { QuizSession } from '../../state/appState';
import styles from './quiz.module.css';

interface Props {
  session: QuizSession;
  onJump: (index: number) => void;
}

/** One segment per question: answered right/wrong (or just "answered" in a mock), current, pending. */
export function SessionTrack({ session, onJump }: Props) {
  return (
    <nav className={styles.track} aria-label="Questions in this session">
      {session.items.map((item, i) => {
        const r = session.results[i];
        const cls = !r ? '' : !session.reveal ? styles.segDone : r.correct ? styles.segOk : styles.segBad;
        return (
          <button
            key={`${item.examId}-${item.q.id}-${i}`}
            type="button"
            className={`${styles.seg} ${cls} ${i === session.index ? styles.segCurrent : ''}`}
            onClick={() => onJump(i)}
            aria-label={`Question ${i + 1}${r ? (session.reveal ? (r.correct ? ', correct' : ', wrong') : ', answered') : ''}`}
            aria-current={i === session.index ? 'step' : undefined}
          />
        );
      })}
    </nav>
  );
}
