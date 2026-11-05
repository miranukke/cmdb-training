import { DOMAINS, DOMAIN_BY_KEY } from '../../domain/blueprint';
import type { DomainKey } from '../../domain/types';
import styles from './ReadinessRing.module.css';

interface Segment {
  key: DomainKey;
  /** 0..1 */
  score: number;
}

interface Props {
  segments: Segment[];
  /** 0..1, shown in the centre. */
  value: number;
  label: string;
  caption?: string;
  size?: number;
}

/**
 * One arc per blueprint domain: arc length = blueprint weight, filled portion = score.
 * So a fully green Govern arc is worth 35% of the ring, exactly like the real exam.
 */
export function ReadinessRing({ segments, value, label, caption, size = 248 }: Props) {
  const stroke = 16;
  const r = size / 2 - stroke / 2 - 14;
  const c = 2 * Math.PI * r;
  const gap = 7;
  const usable = c - gap * DOMAINS.length;
  const center = size / 2;
  const scoreOf = (k: DomainKey) => segments.find((s) => s.key === k)?.score ?? 0;

  let offset = 0;
  const arcs = DOMAINS.map((d) => {
    const len = (usable * d.weight) / 100;
    const fill = len * Math.min(1, Math.max(0, scoreOf(d.key)));
    const arc = { key: d.key, len, fill, offset };
    offset += len + gap;
    return arc;
  });

  const ticks = Array.from({ length: 72 }, (_, i) => i);
  const pctValue = Math.round(value * 100);

  return (
    <figure className={styles.wrap} style={{ width: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={`${label}: ${pctValue}%. ${DOMAINS.map((d) => `${d.label} ${Math.round(scoreOf(d.key) * 100)}%`).join(', ')}`}
      >
        {/* instrument ticks */}
        <g className={styles.ticks}>
          {ticks.map((i) => {
            const a = (i / ticks.length) * Math.PI * 2 - Math.PI / 2;
            const outer = size / 2 - 2;
            const inner = outer - (i % 6 === 0 ? 7 : 3.5);
            return (
              <line
                key={i}
                x1={center + Math.cos(a) * inner}
                y1={center + Math.sin(a) * inner}
                x2={center + Math.cos(a) * outer}
                y2={center + Math.sin(a) * outer}
              />
            );
          })}
        </g>
        <circle className={styles.innerRing} cx={center} cy={center} r={r - stroke - 6} />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {arcs.map((a) => (
            <g key={a.key} style={{ color: `var(--d-${a.key})` }}>
              <circle
                className={styles.track}
                cx={center}
                cy={center}
                r={r}
                strokeWidth={stroke}
                strokeDasharray={`${a.len} ${c - a.len}`}
                strokeDashoffset={-a.offset}
              />
              {a.fill > 0.5 && (
                <circle
                  className={styles.fill}
                  cx={center}
                  cy={center}
                  r={r}
                  strokeWidth={stroke}
                  strokeDasharray={`${a.fill} ${c - a.fill}`}
                  strokeDashoffset={-a.offset}
                  style={{ ['--c' as string]: c }}
                >
                  <title>{`${DOMAIN_BY_KEY[a.key].label}: ${Math.round(scoreOf(a.key) * 100)}%`}</title>
                </circle>
              )}
            </g>
          ))}
        </g>
      </svg>
      <figcaption className={styles.center}>
        <span className={styles.value}>
          {pctValue}
          <span className={styles.unit}>%</span>
        </span>
        <span className={styles.label}>{label}</span>
        {caption && <span className={styles.caption}>{caption}</span>}
      </figcaption>
    </figure>
  );
}
