import { IconArrowLeft, IconArrowsShuffle, IconPlayerPlay, IconRotateClockwise, IconSortAscendingNumbers, IconStar, IconStarFilled } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { DomainBars } from '../components/charts/DomainBars';
import { TileLegend, TileMap } from '../components/charts/TileMap';
import { DomainChip } from '../components/common/DomainChip';
import { EmptyState } from '../components/common/EmptyState';
import { Segmented } from '../components/common/Segmented';
import { StatTile } from '../components/common/StatTile';
import { domainOf } from '../domain/blueprint';
import { computeOverview } from '../domain/overview';
import { examQueue, type ExamFilter } from '../domain/queues';
import { statKey, statusOf, type QuestionStatus } from '../domain/stats';
import { favoriteKey } from '../state/appState';
import { useApp } from '../state/AppContext';
import { examSession, singleQuestionSession } from '../state/sessions';
import styles from './screens.module.css';

const STATUS_TEXT: Record<QuestionStatus, string> = { new: 'New', wrong: 'Wrong', correct: 'Correct', mastered: 'Mastered' };

export function ExamScreen({ examId }: { examId: string }) {
  const { state, navigate, start, dispatch, toggleFavorite } = useApp();
  const exam = state.exams[examId];
  const [filter, setFilter] = useState<ExamFilter>('all');
  const [random, setRandom] = useState(false);

  const tiles = useMemo(
    () => (exam ? exam.questions.map((q) => ({ id: q.id, status: statusOf(state.stats.q[statKey(examId, q.id)]), domain: domainOf(q), title: q.question })) : []),
    [exam, examId, state.stats],
  );
  const overview = useMemo(() => (exam ? computeOverview({ [examId]: exam }, state.stats) : null), [exam, examId, state.stats]);

  if (!exam || !overview) {
    return (
      <EmptyState icon={<IconArrowLeft size={26} />} title="Exam not found">
        <button className="btn" onClick={() => navigate({ name: 'home', tab: 'exams' })}>
          Back to exams
        </button>
      </EmptyState>
    );
  }

  const count = (s: QuestionStatus) => tiles.filter((t) => t.status === s).length;
  const filterCount = (f: ExamFilter) => examQueue(examId, exam, state.stats, f).length;
  const selectedCount = filterCount(filter);
  const now = () => Date.now();

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate({ name: 'home', tab: 'exams' })}>
          <IconArrowLeft size={16} /> Exams
        </button>
        <div className={styles.titleRow}>
          <h1>{exam.meta.title}</h1>
          <span className="eyebrow">
            {exam.questions.length} questions · {exam.meta.remote ? 'repository' : 'imported'}
          </span>
        </div>
      </div>

      <section className={styles.statGrid}>
        <StatTile label="Mastered" value={count('mastered')} tone="accent" />
        <StatTile label="Correct" value={count('correct')} tone="ok" />
        <StatTile label="Wrong" value={count('wrong')} tone={count('wrong') ? 'bad' : undefined} />
        <StatTile label="New" value={count('new')} />
      </section>

      <section className={`card ${styles.practice}`}>
        <div className={styles.practiceRow}>
          <Segmented<ExamFilter>
            label="Which questions"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: filterCount('all') },
              { value: 'not-correct', label: 'Not yet correct', count: filterCount('not-correct') },
              { value: 'wrong', label: 'Wrong', count: filterCount('wrong') },
              { value: 'new', label: 'New', count: filterCount('new') },
            ]}
          />
          <button className="btn btn-sm" aria-pressed={random} onClick={() => setRandom((r) => !r)} title="Question order">
            {random ? <IconArrowsShuffle size={16} /> : <IconSortAscendingNumbers size={16} />}
            {random ? 'Shuffled' : 'In order'}
          </button>
        </div>
        <button
          className="btn btn-primary"
          disabled={!selectedCount}
          onClick={() => start(examSession(state.exams, state.stats, examId, filter, random, now()), 'No questions match that filter.')}
        >
          <IconPlayerPlay size={17} /> Start · {selectedCount} question{selectedCount === 1 ? '' : 's'}
        </button>
      </section>

      <section className={styles.twoCol}>
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2>Question map</h2>
            <span className="eyebrow">click a tile to practise it</span>
          </div>
          <TileMap tiles={tiles} onSelect={(id) => start(singleQuestionSession(state.exams, examId, id, now()))} />
          <div className={styles.legendRow}>
            <TileLegend />
          </div>
        </div>
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2>Domain mix</h2>
            <span className="eyebrow">this exam</span>
          </div>
          <DomainBars domains={overview.domains} />
        </div>
      </section>

      <details className={`card ${styles.questionList}`}>
        <summary>
          <h2>All questions</h2>
          <span className="eyebrow">{exam.questions.length}</span>
        </summary>
        <ul>
          {exam.questions.map((q) => {
            const status = statusOf(state.stats.q[statKey(examId, q.id)]);
            const starred = Boolean(state.favorites[favoriteKey(examId, q.id)]);
            return (
              <li key={q.id}>
                <button className={styles.qRow} onClick={() => start(singleQuestionSession(state.exams, examId, q.id, now()))}>
                  <span className={styles.qNum}>{q.id}</span>
                  <span className={styles.qText}>{q.question}</span>
                  <DomainChip domain={domainOf(q)} short />
                  <span className={`${styles.status} ${styles[`s_${status}`]}`}>{STATUS_TEXT[status]}</span>
                </button>
                <button
                  className={`btn btn-ghost btn-sm btn-icon ${starred ? styles.starred : ''}`}
                  aria-label={starred ? 'Remove from favorites' : 'Add to favorites'}
                  aria-pressed={starred}
                  onClick={() => toggleFavorite(examId, q)}
                >
                  {starred ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                </button>
              </li>
            );
          })}
        </ul>
      </details>

      <div className={styles.dangerRow}>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            if (confirm(`Reset all progress for "${exam.meta.title}"?`)) dispatch({ type: 'exam/progressReset', id: examId });
          }}
        >
          <IconRotateClockwise size={15} /> Reset progress
        </button>
      </div>
    </div>
  );
}
