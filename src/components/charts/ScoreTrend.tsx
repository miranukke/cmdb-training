import { useId } from 'react';
import { PASS_MARK } from '../../domain/blueprint';
import type { SessionRecord } from '../../domain/types';
import { formatDateTime, pct } from '../../lib/format';
import styles from './ScoreTrend.module.css';

interface Props {
  sessions: SessionRecord[];
  limit?: number;
}

/** Score of recent sessions (3+ answers) against the 70% target line. */
export function ScoreTrend({ sessions, limit = 24 }: Props) {
  const gradientId = useId();
  const points = sessions.filter((s) => s.total >= 3).slice(-limit);
  if (points.length < 2) {
    return <p className={styles.empty}>Finish a couple of sessions with 3+ answers to see your score trend.</p>;
  }

  const w = 320;
  const h = 110;
  const pad = { l: 26, r: 8, t: 10, b: 14 };
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (h - pad.t - pad.b);
  const values = points.map((s) => pct(s.correct, s.total));
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = values[values.length - 1];
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return (
    <div className={styles.wrap}>
      <div className={styles.summary}>
        <span>
          Last <b className={last >= PASS_MARK ? styles.ok : styles.bad}>{last}%</b>
        </span>
        <span>
          Avg <b>{avg}%</b>
        </span>
        <span>{points.length} sessions</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className={styles.svg} role="img" aria-label={`Recent session scores, last ${last}%, average ${avg}%`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={pad.l - 6} y={y(v) + 3} className={styles.axis} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={w - pad.r} y1={y(PASS_MARK)} y2={y(PASS_MARK)} className={styles.pass} />
        <text x={w - pad.r} y={y(PASS_MARK) - 4} className={styles.passLabel} textAnchor="end">
          target {PASS_MARK}%
        </text>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} className={styles.line} />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={3.2} className={v >= PASS_MARK ? styles.dotOk : styles.dotBad}>
            <title>{`${formatDateTime(points[i].at)} · ${points[i].title}: ${v}% (${points[i].correct}/${points[i].total})`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
