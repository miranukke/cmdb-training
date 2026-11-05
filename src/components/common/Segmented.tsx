import styles from './common.module.css';

interface Option<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Pill-style radio group. */
export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? styles.segActive : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className={styles.segCount}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
