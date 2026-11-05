import { IconArrowLeft, IconCheck, IconHome, IconRepeat, IconTrophy, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { ReadinessRing } from '../components/charts/ReadinessRing';
import { DomainChip } from '../components/common/DomainChip';
import { Explanation } from '../components/common/Explanation';
import { Segmented } from '../components/common/Segmented';
import { StatTile } from '../components/common/StatTile';
import { DOMAINS, PASS_MARK, domainOf } from '../domain/blueprint';
import { correctAnswerText, givenAnswerText } from '../domain/scoring';
import { formatDuration, pct } from '../lib/format';
import { summarizeSession, type QuizSession } from '../state/appState';
import { useApp } from '../state/AppContext';
import { retrySession } from '../state/sessions';
import styles from './screens.module.css';

export function ResultsScreen() {
  const { state, navigate, start } = useApp();
  const s = state.session as QuizSession;
  const finishedAt = s.finishedAt ?? Date.now();
  const summary = useMemo(() => summarizeSession(s, finishedAt), [s, finishedAt]);
  const isMock = s.mode === 'mock';
  // In a mock exam unanswered questions count as wrong, like the real thing.
  const denominator = isMock ? s.items.length : summary.total;
  const score = pct(summary.correct, denominator);
  const passed = score >= PASS_MARK;
  const missed = s.items.map((item, i) => ({ item, i, r: s.results[i] })).filter(({ r }) => !r?.correct);
  const [show, setShow] = useState<'missed' | 'all'>(missed.length ? 'missed' : 'all');
  const rows = s.items.map((item, i) => ({ item, i, r: s.results[i] })).filter(({ r }) => show === 'all' || !r?.correct);

  const segments = DOMAINS.map((d) => {
    const [c, t] = summary.byDomain[d.key] ?? [0, 0];
    return { key: d.key, score: t ? c / t : 0 };
  });

  return (
    <div className={styles.page}>
      <section className={`card ${styles.resultHero}`}>
        <ReadinessRing segments={segments} value={denominator ? summary.correct / denominator : 0} label={isMock ? 'exam score' : 'session score'} caption={`target ${PASS_MARK}%`} size={220} />
        <div className={styles.resultBody}>
          <p className="eyebrow">{s.title}</p>
          <h1 className={styles.resultTitle}>
            {passed ? (
              <>
                <IconTrophy size={30} className={styles.trophy} /> {isMock ? 'Exam-ready pace!' : 'Strong session'}
              </>
            ) : summary.total === 0 ? (
              'No answers recorded'
            ) : (
              `${PASS_MARK - score} points below the ${PASS_MARK}% target`
            )}
          </h1>
          <div className={styles.statGrid}>
            <StatTile label="Correct" value={`${summary.correct}/${denominator}`} tone={passed ? 'ok' : 'bad'} />
            <StatTile label="Answered" value={`${summary.total}/${s.items.length}`} />
            <StatTile label="Time" value={formatDuration(summary.durationSec)} hint={summary.total ? `${Math.round(summary.durationSec / summary.total)}s per question` : undefined} />
          </div>
          <ul className={styles.domainScores}>
            {DOMAINS.map((d) => {
              const [c, t] = summary.byDomain[d.key] ?? [0, 0];
              if (!t) return null;
              return (
                <li key={d.key} style={{ color: `var(--d-${d.key})` }}>
                  <i />
                  <span>{d.short}</span>
                  <b>{pct(c, t)}%</b>
                  <em>
                    {c}/{t}
                  </em>
                </li>
              );
            })}
          </ul>
          <div className={styles.resultActions}>
            {missed.length > 0 && (
              <button className="btn btn-primary" onClick={() => start(retrySession(s, Date.now()))}>
                <IconRepeat size={16} /> Retry {missed.length} missed
              </button>
            )}
            {s.examId && state.exams[s.examId] && (
              <button className="btn" onClick={() => navigate({ name: 'exam', examId: s.examId! })}>
                <IconArrowLeft size={16} /> Back to exam
              </button>
            )}
            <button className="btn" onClick={() => navigate({ name: 'home', tab: 'overview' })}>
              <IconHome size={16} /> Dashboard
            </button>
          </div>
        </div>
      </section>

      <section className={styles.review}>
        <div className={styles.panelHead}>
          <h2>Review</h2>
          <Segmented
            label="Show"
            value={show}
            onChange={setShow}
            options={[
              { value: 'missed', label: 'Missed', count: missed.length },
              { value: 'all', label: 'All', count: s.items.length },
            ]}
          />
        </div>
        {rows.length === 0 && <p className={styles.hint}>Nothing missed. Every answer was correct.</p>}
        <ol className={styles.reviewList}>
          {rows.map(({ item, i, r }) => (
            <li key={i} className={`card ${styles.reviewItem}`}>
              <div className={styles.reviewHead}>
                <span className={`${styles.reviewMark} ${r?.correct ? styles.markOk : styles.markBad}`}>{r?.correct ? <IconCheck size={15} /> : <IconX size={15} />}</span>
                <span className={styles.qNum}>#{i + 1}</span>
                <DomainChip domain={domainOf(item.q)} short />
              </div>
              <p className={styles.reviewQ}>{item.q.question}</p>
              <div className={styles.answers}>
                {!r?.correct && (
                  <div>
                    <span className="eyebrow">Your answer</span>
                    {givenAnswerText(item.q, r?.answer).map((t) => (
                      <p key={t} className={styles.given}>
                        {t}
                      </p>
                    ))}
                  </div>
                )}
                <div>
                  <span className="eyebrow">Correct answer</span>
                  {correctAnswerText(item.q).map((t) => (
                    <p key={t} className={styles.correctAns}>
                      {t}
                    </p>
                  ))}
                </div>
              </div>
              {item.q.explanation && (
                <details className={styles.why}>
                  <summary>Why?</summary>
                  <Explanation text={item.q.explanation} />
                </details>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
