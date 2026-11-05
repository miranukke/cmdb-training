import type { ReactNode } from 'react';
import styles from './common.module.css';

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3>{title}</h3>
      {children && <div className={styles.emptyBody}>{children}</div>}
    </div>
  );
}
