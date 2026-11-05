import { IconPlayerPlay } from '@tabler/icons-react';
import { DOMAINS } from '../../domain/blueprint';
import type { DomainProgress } from '../../domain/overview';
import type { DomainKey } from '../../domain/types';
import styles from './DomainBars.module.css';

interface Props {
  domains: DomainProgress[];
  onPractice?: (key: DomainKey) => void;
}

/** Per-domain mastery: mastered (solid) + correct (lighter) over the domain's question count. */
export function DomainBars({ domains, onPractice }: Props) {
  return (
    <ul className={styles.list}>
      {DOMAINS.map((d) => {
        const p = domains.find((x) => x.key === d.key);
        const total = p?.total ?? 0;
        const mastered = total ? ((p?.mastered ?? 0) / total) * 100 : 0;
        const correct = total ? (((p?.correct ?? 0) - (p?.mastered ?? 0)) / total) * 100 : 0;
        const wrong = total ? ((p?.wrong ?? 0) / total) * 100 : 0;
        return (
          <li key={d.key} className={styles.row} style={{ color: `var(--d-${d.key})` }}>
            <div className={styles.head}>
              <span className={styles.swatch} aria-hidden />
              <span className={styles.name}>{d.label}</span>
              <span className={styles.weight}>{d.weight}%</span>
              <span className={styles.count}>
                {p?.correct ?? 0}/{total}
              </span>
              {onPractice && total > 0 && (
                <button className={`btn btn-ghost btn-sm btn-icon ${styles.play}`} onClick={() => onPractice(d.key)} title={`Drill ${d.label}`} aria-label={`Drill ${d.label}`}>
                  <IconPlayerPlay size={15} />
                </button>
              )}
            </div>
            <div className={styles.bar} role="presentation">
              <span className={styles.mastered} style={{ width: `${mastered}%` }} />
              <span className={styles.correct} style={{ width: `${correct}%` }} />
              <span className={styles.wrong} style={{ width: `${wrong}%` }} />
            </div>
            <p className={styles.blurb}>{d.blurb}</p>
          </li>
        );
      })}
    </ul>
  );
}
