import { UI_LOCALE, dayKey } from '../../lib/format';
import styles from './ActivityHeatmap.module.css';

interface Props {
  days: Record<string, number>;
  now: number;
  weeks?: number;
}

const DAY = 86_400_000;
const level = (n: number) => (n <= 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4);

/** Answers per day for the last N weeks, Monday-first columns (GitHub-style). */
export function ActivityHeatmap({ days, now, weeks = 20 }: Props) {
  const cell = 12;
  const gap = 3;
  const today = new Date(now);
  const mondayOffset = (today.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset - (weeks - 1) * 7).getTime();

  const cells: { x: number; y: number; key: string; n: number; future: boolean }[] = [];
  const months: { x: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      // Use noon to stay clear of DST edges.
      const ts = start + (w * 7 + d) * DAY + DAY / 2;
      const key = dayKey(ts);
      cells.push({ x: w * (cell + gap), y: d * (cell + gap) + 16, key, n: days[key] ?? 0, future: ts > now + DAY / 2 });
      if (d === 0) {
        const m = new Date(ts).getMonth();
        if (m !== lastMonth) {
          months.push({ x: w * (cell + gap), label: new Date(ts).toLocaleDateString(UI_LOCALE, { month: 'short' }) });
          lastMonth = m;
        }
      }
    }
  }
  const width = weeks * (cell + gap) - gap;
  const height = 7 * (cell + gap) - gap + 16;
  const total = cells.reduce((s, c) => s + c.n, 0);

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label={`${total} answers in the last ${weeks} weeks`}>
        {months.map((m) => (
          <text key={`${m.x}-${m.label}`} x={m.x} y={10} className={styles.month}>
            {m.label}
          </text>
        ))}
        {cells.map((c) =>
          c.future ? null : (
            <rect key={c.key} x={c.x} y={c.y} width={cell} height={cell} rx={3} className={styles.cell} style={{ fill: `var(--heat-${level(c.n)})` }}>
              <title>{`${new Date(c.key + 'T12:00').toLocaleDateString(UI_LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })}: ${c.n} answer${c.n === 1 ? '' : 's'}`}</title>
            </rect>
          ),
        )}
      </svg>
      <div className={styles.legend} aria-hidden>
        <span>less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} style={{ background: `var(--heat-${l})` }} />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
