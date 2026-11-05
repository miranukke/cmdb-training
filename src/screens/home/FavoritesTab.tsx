import { IconPlayerPlay, IconStar, IconStarOff } from '@tabler/icons-react';
import { DomainChip } from '../../components/common/DomainChip';
import { EmptyState } from '../../components/common/EmptyState';
import { domainOf } from '../../domain/blueprint';
import { useApp } from '../../state/AppContext';
import { favoritesSession, singleQuestionSession } from '../../state/sessions';
import styles from './home.module.css';

export function FavoritesTab() {
  const { state, start, toggleFavorite } = useApp();
  const favs = Object.values(state.favorites);

  if (!favs.length) {
    return (
      <EmptyState icon={<IconStar size={26} />} title="No favorites yet">
        Star a question while practising (or press <kbd>F</kbd>) to collect tricky ones here.
      </EmptyState>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.footerRow}>
        <p className={styles.syncNote}>{favs.length} starred question{favs.length === 1 ? '' : 's'}</p>
        <button className="btn btn-primary" onClick={() => start(favoritesSession(state.exams, state.favorites, Date.now()))}>
          <IconPlayerPlay size={16} /> Practice all
        </button>
      </div>
      <ul className={styles.list}>
        {favs.map(({ examId, examTitle, question }) => {
          const live = state.exams[examId]?.questions.find((q) => q.id === question.id) ?? question;
          return (
            <li key={`${examId}_${question.id}`} className={`card ${styles.listRow}`}>
              <button
                className={styles.listMain}
                onClick={() => start(singleQuestionSession(state.exams, examId, question.id, Date.now()), 'That exam is no longer loaded.')}
              >
                <span className={styles.listMeta}>
                  <DomainChip domain={domainOf(live)} short />
                  <span>
                    {examTitle} · Q{question.id}
                  </span>
                </span>
                <span className={styles.listText}>{live.question}</span>
              </button>
              <button className="btn btn-ghost btn-icon" title="Remove from favorites" aria-label="Remove from favorites" onClick={() => toggleFavorite(examId, live)}>
                <IconStarOff size={18} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
