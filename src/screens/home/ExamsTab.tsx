import { IconArrowRight, IconFileImport, IconRefresh, IconTrash } from '@tabler/icons-react';
import { useRef, useState, type DragEvent } from 'react';
import { TileMap } from '../../components/charts/TileMap';
import { StatusBar } from '../../components/common/StatusBar';
import { domainOf } from '../../domain/blueprint';
import { statKey, statusOf } from '../../domain/stats';
import type { Exam, StatsState } from '../../domain/types';
import { pct } from '../../lib/format';
import { useApp } from '../../state/AppContext';
import styles from './home.module.css';

function examTiles(examId: string, exam: Exam, stats: StatsState) {
  return exam.questions.map((q) => ({ id: q.id, status: statusOf(stats.q[statKey(examId, q.id)]), domain: domainOf(q), title: q.question }));
}

export function ExamsTab() {
  const { state, navigate, dispatch, importExamFile, refreshExams } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const entries = Object.entries(state.exams).sort(([, a], [, b]) => a.meta.title.localeCompare(b.meta.title, undefined, { numeric: true }));

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void importExamFile(file);
  };

  return (
    <div className={styles.stack}>
      <div className={styles.examGrid}>
        {entries.map(([id, exam]) => {
          const tiles = examTiles(id, exam, state.stats);
          const count = (s: string) => tiles.filter((t) => t.status === s).length;
          const done = count('mastered') + count('correct');
          return (
            <article key={id} className={`card ${styles.examCard}`}>
              <div className={styles.examHead}>
                <div>
                  <h3>{exam.meta.title}</h3>
                  <p className={styles.examMeta}>
                    {exam.questions.length} questions · {exam.meta.remote ? 'from repository' : 'imported'}
                  </p>
                </div>
                <span className={styles.examPct}>{pct(done, tiles.length)}%</span>
              </div>
              <StatusBar mastered={count('mastered')} correct={count('correct')} wrong={count('wrong')} total={tiles.length} />
              <TileMap tiles={tiles} compact />
              <div className={styles.examFoot}>
                <span className={styles.examCounts}>
                  <b>{count('mastered')}</b> mastered · <b>{count('wrong')}</b> wrong · <b>{count('new')}</b> new
                </span>
                <span className={styles.examButtons}>
                  <button
                    className="btn btn-ghost btn-sm btn-icon btn-danger"
                    title="Remove exam and its progress"
                    aria-label={`Remove ${exam.meta.title}`}
                    onClick={() => {
                      if (confirm(`Remove "${exam.meta.title}" and its progress?${exam.meta.remote ? ' It will be re-downloaded on the next reload.' : ''}`)) {
                        dispatch({ type: 'exam/deleted', id });
                      }
                    }}
                  >
                    <IconTrash size={16} />
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate({ name: 'exam', examId: id })}>
                    Open <IconArrowRight size={16} />
                  </button>
                </span>
              </div>
            </article>
          );
        })}

        <label
          className={`${styles.dropZone} ${dragOver ? styles.dropActive : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <IconFileImport size={28} />
          <span className={styles.dropTitle}>Import exam JSON</span>
          <span className={styles.dropText}>Drop a file here or click to browse. Same format as the files in /Exams.</span>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importExamFile(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <div className={styles.footerRow}>
        <span className={styles.syncNote}>{state.sync.message}</span>
        <span className={styles.examButtons}>
          <button className="btn btn-sm" onClick={() => void refreshExams()} disabled={state.sync.status === 'loading'}>
            <IconRefresh size={15} /> Reload exams
          </button>
          {entries.length > 0 && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (confirm('Remove all exams and per-question progress? (Session history is kept.)')) dispatch({ type: 'exam/clearedAll' });
              }}
            >
              <IconTrash size={15} /> Remove all
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
