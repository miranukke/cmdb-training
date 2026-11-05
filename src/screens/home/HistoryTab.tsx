import { IconDownload, IconHistory, IconTrash, IconUpload } from '@tabler/icons-react';
import { EmptyState } from '../../components/common/EmptyState';
import { PASS_MARK } from '../../domain/blueprint';
import type { SessionMode } from '../../domain/types';
import { formatDateTime, formatDuration, pct } from '../../lib/format';
import { useApp } from '../../state/AppContext';
import styles from './home.module.css';

const MODE_LABEL: Record<SessionMode, string> = {
  exam: 'Exam',
  single: 'Single',
  favorites: 'Favorites',
  domain: 'Domain drill',
  review: 'Smart review',
  mistakes: 'Mistakes',
  mock: 'Mock exam',
  retry: 'Retry',
};

export function HistoryTab() {
  const { state, dispatch, importStats } = useApp();
  const sessions = [...state.stats.sessions].reverse();

  function exportProgress() {
    const blob = new Blob([JSON.stringify({ app: 'cis-df-trainer', exportedAt: new Date().toISOString(), stats: state.stats }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cis-df-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className={styles.stack}>
      <div className={`card ${styles.panel} ${styles.backup}`}>
        <div>
          <h2>Backup &amp; restore</h2>
          <p className={styles.syncNote}>Progress lives in this browser. Export it to move to another device or keep a backup.</p>
        </div>
        <div className={styles.examButtons}>
          <button className="btn btn-sm" onClick={exportProgress}>
            <IconDownload size={15} /> Export
          </button>
          <label className="btn btn-sm">
            <IconUpload size={15} /> Restore
            <input
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && confirm('Replace your current progress with this backup?')) void importStats(file);
                e.target.value = '';
              }}
            />
          </label>
          {sessions.length > 0 && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (confirm('Clear session history? Per-question progress is kept.')) dispatch({ type: 'stats/replaced', stats: { ...state.stats, sessions: [] } });
              }}
            >
              <IconTrash size={15} /> Clear history
            </button>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={<IconHistory size={26} />} title="No sessions yet">
          Every practice session and mock exam you finish (or leave part-way) shows up here.
        </EmptyState>
      ) : (
        <div className={`card ${styles.tableCard}`}>
          <table className={styles.history}>
            <thead>
              <tr>
                <th>When</th>
                <th>Session</th>
                <th className={styles.num}>Score</th>
                <th className={styles.num}>Time</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const score = pct(s.correct, s.total);
                return (
                  <tr key={`${s.at}-${i}`}>
                    <td className={styles.when}>{formatDateTime(s.at)}</td>
                    <td>
                      <span className={styles.modeTag}>{MODE_LABEL[s.mode]}</span> {s.title}
                    </td>
                    <td className={styles.num}>
                      <span className={score >= PASS_MARK ? styles.ok : styles.bad}>{score}%</span>{' '}
                      <span className={styles.dim}>
                        {s.correct}/{s.total}
                      </span>
                    </td>
                    <td className={`${styles.num} ${styles.dim}`}>{formatDuration(s.durationSec)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
