import { IconExternalLink } from '@tabler/icons-react';
import { linkParts, splitExplanation } from '../../lib/text';
import styles from './common.module.css';

/** Renders an explanation as text with clickable links, and its "Source:" list as chips. */
export function Explanation({ text }: { text?: string }) {
  const { body, sources } = splitExplanation(text);
  if (!body && !sources.length) return null;
  return (
    <div className={styles.explanation}>
      {body && (
        <p>
          {linkParts(body).map((p, i) =>
            p.kind === 'text' ? (
              <span key={i}>{p.value}</span>
            ) : (
              <a key={i} href={p.href} target="_blank" rel="noreferrer">
                {p.label}
              </a>
            ),
          )}
        </p>
      )}
      {sources.length > 0 && (
        <div className={styles.sources}>
          <span className="eyebrow">Source</span>
          {sources.map((s, i) => {
            const [part] = linkParts(s);
            return part?.kind === 'link' && linkParts(s).length === 1 ? (
              <a key={i} className={styles.source} href={part.href} target="_blank" rel="noreferrer">
                {part.label} <IconExternalLink size={12} />
              </a>
            ) : (
              <span key={i} className={styles.source}>
                {s}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
