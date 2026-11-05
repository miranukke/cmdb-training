import { IconAlertTriangle, IconBrain, IconCloudDownload, IconFlame, IconHourglass, IconTarget } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ActivityHeatmap } from '../../components/charts/ActivityHeatmap';
import { DomainBars } from '../../components/charts/DomainBars';
import { ReadinessRing } from '../../components/charts/ReadinessRing';
import { ScoreTrend } from '../../components/charts/ScoreTrend';
import { EmptyState } from '../../components/common/EmptyState';
import { StatTile } from '../../components/common/StatTile';
import { DOMAIN_BY_KEY, EXAM_DURATION_MIN, EXAM_QUESTION_COUNT, PASS_MARK } from '../../domain/blueprint';
import { computeOverview } from '../../domain/overview';
import { allItems, dedupe, mistakesQueue, reviewQueue } from '../../domain/queues';
import { currentStreak } from '../../domain/stats';
import { useNow } from '../../hooks/useNow';
import { dayKey, pct } from '../../lib/format';
import { useApp } from '../../state/AppContext';
import { domainSession, mistakesSession, mockSession, reviewSession } from '../../state/sessions';
import styles from './home.module.css';

export function OverviewTab() {
  const { state, start } = useApp();
  const { exams, stats } = state;
  const now = useNow(60_000);

  const ov = useMemo(() => computeOverview(exams, stats), [exams, stats]);
  const uniqueCount = useMemo(() => dedupe(allItems(exams)).length, [exams]);
  const dueCount = useMemo(() => reviewQueue(exams, stats, now).length, [exams, stats, now]);
  const mistakeCount = useMemo(() => mistakesQueue(exams, stats).length, [exams, stats]);
  const streak = currentStreak(stats.days, now);
  const today = stats.days[dayKey(now)] ?? 0;
  const weakest = ov.domains.filter((d) => d.total > 0).sort((a, b) => a.score - b.score)[0];

  if (!Object.keys(exams).length) {
    return (
      <EmptyState icon={<IconCloudDownload size={26} />} title={state.sync.status === 'loading' ? 'Loading exams…' : 'No exams yet'}>
        {state.sync.status === 'loading'
          ? 'Fetching the question bank.'
          : 'Exams load automatically from the repository. You can also import an exam JSON file from the Exams tab.'}
      </EmptyState>
    );
  }

  const readyPct = Math.round(ov.readiness * 100);
  const verdict =
    ov.totals.all - ov.totals.new === 0
      ? 'Answer a few questions to light up the ring.'
      : readyPct >= PASS_MARK
        ? 'On track for the exam. Keep it fresh with a mock exam.'
        : `${PASS_MARK - readyPct} points to the ${PASS_MARK}% target. Drill your weakest domain.`;

  return (
    <div className={styles.stack}>
      <section className={`card ${styles.hero}`}>
        <div className={styles.heroRing}>
          <ReadinessRing segments={ov.domains} value={ov.readiness} label="exam readiness" caption={`target ${PASS_MARK}%`} />
        </div>
        <div className={styles.heroBody}>
          <p className="eyebrow">CIS-DF blueprint · {EXAM_QUESTION_COUNT} questions · {EXAM_DURATION_MIN} min</p>
          <h1 className={styles.heroTitle}>{verdict}</h1>
          <p className={styles.heroText}>
            Each arc is a blueprint domain sized by its exam weight. It fills as you answer that domain's questions correctly; two correct in a
            row marks a question <em>mastered</em>.
          </p>
          <DomainBars domains={ov.domains} onPractice={(k) => start(domainSession(exams, k, Date.now()))} />
        </div>
      </section>

      <section className={styles.statRow} aria-label="Totals">
        <StatTile label="Answers" value={ov.attempts} hint={`${today} today`} />
        <StatTile
          label="Accuracy"
          value={`${pct(ov.attemptsCorrect, ov.attempts)}%`}
          tone={ov.attempts ? (pct(ov.attemptsCorrect, ov.attempts) >= PASS_MARK ? 'ok' : 'warn') : undefined}
          hint="all attempts"
        />
        <StatTile label="Mastered" value={ov.totals.mastered} hint={`${ov.totals.correct} correct · ${ov.totals.wrong} wrong`} tone="accent" />
        <StatTile label="Day streak" value={streak} icon={<IconFlame size={14} className={streak ? styles.flame : undefined} />} hint={streak ? 'keep it going' : 'answer today to start one'} />
      </section>

      <section className={styles.actions} aria-label="Practice modes">
        <button className={`${styles.action} ${styles.actionHot}`} onClick={() => start(reviewSession(exams, stats, Date.now()), 'Nothing is due: answer some questions first.')}>
          <IconBrain size={22} />
          <span className={styles.actionTitle}>Smart review</span>
          <span className={styles.actionText}>Mistakes first, then questions you haven't mastered yet.</span>
          <span className={styles.badge}>{dueCount} due</span>
        </button>
        <button className={styles.action} onClick={() => start(mockSession(exams, Date.now()))}>
          <IconHourglass size={22} />
          <span className={styles.actionTitle}>Mock exam</span>
          <span className={styles.actionText}>
            {EXAM_QUESTION_COUNT} questions weighted like the blueprint, {EXAM_DURATION_MIN}-minute timer, results at the end.
          </span>
          <span className={styles.badge}>{Math.min(EXAM_QUESTION_COUNT, uniqueCount)} q</span>
        </button>
        <button className={styles.action} onClick={() => start(mistakesSession(exams, stats, Date.now()), 'No mistakes to fix. Nice!')}>
          <IconAlertTriangle size={22} />
          <span className={styles.actionTitle}>Fix mistakes</span>
          <span className={styles.actionText}>Every question you got wrong last time, across all exams.</span>
          <span className={styles.badge}>{mistakeCount}</span>
        </button>
        {weakest && (
          <button className={styles.action} style={{ ['--tint' as string]: `var(--d-${weakest.key})` }} onClick={() => start(domainSession(exams, weakest.key, Date.now()))}>
            <IconTarget size={22} />
            <span className={styles.actionTitle}>Drill {DOMAIN_BY_KEY[weakest.key].label}</span>
            <span className={styles.actionText}>Your weakest domain right now ({Math.round(weakest.score * 100)}% done).</span>
            <span className={styles.badge}>{weakest.total} q</span>
          </button>
        )}
      </section>

      <section className={styles.twoCol}>
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2>Activity</h2>
            <span className="eyebrow">{streak} day streak</span>
          </div>
          <ActivityHeatmap days={stats.days} now={now} />
        </div>
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2>Score trend</h2>
            <span className="eyebrow">sessions</span>
          </div>
          <ScoreTrend sessions={stats.sessions} />
        </div>
      </section>
    </div>
  );
}
