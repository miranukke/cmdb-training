import type { QuestionStatus } from '../../domain/stats';
import type { DomainKey } from '../../domain/types';
import styles from './TileMap.module.css';

export interface Tile {
  id: number;
  status: QuestionStatus;
  domain: DomainKey | null;
  title: string;
}

interface Props {
  tiles: Tile[];
  /** Compact = tiny non-interactive squares (exam cards); otherwise numbered buttons. */
  compact?: boolean;
  onSelect?: (id: number) => void;
}

const STATUS_LABEL: Record<QuestionStatus, string> = {
  new: 'not answered',
  wrong: 'wrong last time',
  correct: 'correct',
  mastered: 'mastered',
};

/** Every question as a tile, like CIs in a rack: colour = status, top stripe = blueprint domain. */
export function TileMap({ tiles, compact, onSelect }: Props) {
  if (compact) {
    return (
      <div className={styles.compact} aria-hidden>
        {tiles.map((t) => (
          <i key={t.id} className={styles[t.status]} />
        ))}
      </div>
    );
  }
  return (
    <div className={styles.grid}>
      {tiles.map((t, i) => (
        <button
          key={t.id}
          type="button"
          className={`${styles.tile} ${styles[t.status]}`}
          style={{ ['--domain' as string]: t.domain ? `var(--d-${t.domain})` : 'transparent', ['--i' as string]: Math.min(i, 60) }}
          onClick={() => onSelect?.(t.id)}
          title={`Q${t.id} · ${STATUS_LABEL[t.status]} — ${t.title}`}
          aria-label={`Question ${t.id}, ${STATUS_LABEL[t.status]}`}
        >
          {t.id}
        </button>
      ))}
    </div>
  );
}

export function TileLegend() {
  return (
    <div className={styles.legend}>
      {(['new', 'wrong', 'correct', 'mastered'] as QuestionStatus[]).map((s) => (
        <span key={s}>
          <i className={styles[s]} /> {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}
