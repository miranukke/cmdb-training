import { DOMAIN_BY_KEY } from '../../domain/blueprint';
import type { DomainKey } from '../../domain/types';
import styles from './common.module.css';

export function DomainChip({ domain, short }: { domain: DomainKey | null; short?: boolean }) {
  if (!domain) return null;
  const d = DOMAIN_BY_KEY[domain];
  return (
    <span className={styles.chip} style={{ color: `var(--d-${domain})` }} title={`Blueprint domain: ${d.label} (${d.weight}% of the exam)`}>
      <i aria-hidden />
      {short ? d.short : d.label}
    </span>
  );
}
