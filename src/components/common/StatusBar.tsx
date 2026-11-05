import styles from './common.module.css';

interface Props {
  mastered: number;
  correct: number;
  wrong: number;
  total: number;
}

/** Stacked bar: mastered / correct / wrong / not yet answered. */
export function StatusBar({ mastered, correct, wrong, total }: Props) {
  const w = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div
      className={styles.statusBar}
      role="img"
      aria-label={`${mastered} mastered, ${correct} correct, ${wrong} wrong, ${total - mastered - correct - wrong} not answered`}
    >
      <span style={{ width: w(mastered), background: 'var(--tile-mastered)' }} />
      <span style={{ width: w(correct), background: 'var(--tile-correct)' }} />
      <span style={{ width: w(wrong), background: 'var(--tile-wrong)' }} />
    </div>
  );
}
