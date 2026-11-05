import type { ReactNode } from 'react';
import styles from './common.module.css';

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'ok' | 'bad' | 'warn' | 'accent';
}

export function StatTile({ label, value, hint, icon, tone }: Props) {
  return (
    <div className={`${styles.stat} ${tone ? styles[tone] : ''}`}>
      <div className={styles.statHead}>
        {icon}
        <span className="eyebrow">{label}</span>
      </div>
      <div className={styles.statValue}>{value}</div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </div>
  );
}
