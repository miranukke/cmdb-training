import { IconCheck, IconX } from '@tabler/icons-react';
import { useState, type DragEvent } from 'react';
import type { Question } from '../../domain/types';
import styles from './quiz.module.css';

interface Props {
  q: Question;
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  locked: boolean;
  reveal: boolean;
}

/**
 * Drag-and-drop matching. Works with mouse drag, or tap an item then tap a target
 * (touch screens and keyboard users), like the exam's "drag items to targets".
 */
export function MatchBoard({ q, mapping, onChange, locked, reveal }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const items = q.items ?? [];
  const targets = q.targets ?? [];
  const used = new Set(Object.values(mapping));
  const itemText = new Map(items.map((i) => [i.id, i.text]));

  function place(targetId: string, itemId: string) {
    const next: Record<string, string> = {};
    // An item can sit in one target only.
    for (const [t, i] of Object.entries(mapping)) if (i !== itemId && t !== targetId) next[t] = i;
    next[targetId] = itemId;
    onChange(next);
    setPicked(null);
  }

  function clear(targetId: string) {
    const next = { ...mapping };
    delete next[targetId];
    onChange(next);
  }

  function onTargetClick(targetId: string) {
    if (locked) return;
    if (picked) place(targetId, picked);
    else if (mapping[targetId]) clear(targetId);
  }

  const onDrop = (targetId: string) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id && !locked) place(targetId, id);
  };

  return (
    <div className={styles.match}>
      <div>
        <p className="eyebrow">Items {q.items && q.targets && q.items.length > q.targets.length ? '· some won’t be used' : ''}</p>
        <ul className={styles.pool}>
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                draggable={!locked}
                disabled={locked}
                aria-pressed={picked === it.id}
                className={`${styles.item} ${used.has(it.id) ? styles.itemUsed : ''} ${picked === it.id ? styles.itemPicked : ''}`}
                onClick={() => setPicked(picked === it.id ? null : it.id)}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', it.id)}
              >
                {it.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="eyebrow">Targets {picked && !locked ? '· tap one to place' : ''}</p>
        <ul className={styles.targets}>
          {targets.map((t) => {
            const placed = mapping[t.id];
            const expected = q.correct_mapping?.[t.id];
            const ok = reveal && placed === expected;
            const bad = reveal && placed !== expected;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={locked && !reveal}
                  className={`${styles.target} ${picked && !locked ? styles.targetArmed : ''} ${ok ? styles.tOk : ''} ${bad ? styles.tBad : ''}`}
                  onClick={() => onTargetClick(t.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop(t.id)}
                  aria-label={`${t.label}${placed ? `: ${itemText.get(placed)}` : ': empty'}`}
                >
                  <span className={styles.targetLabel}>{t.label}</span>
                  <span className={`${styles.slot} ${placed ? styles.slotFilled : ''}`}>
                    {placed ? itemText.get(placed) : 'Drop here'}
                    {ok && <IconCheck size={16} />}
                    {bad && <IconX size={16} />}
                  </span>
                  {bad && expected && <span className={styles.expected}>✓ {itemText.get(expected)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
