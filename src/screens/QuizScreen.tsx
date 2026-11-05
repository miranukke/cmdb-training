import { IconArrowLeft, IconArrowRight, IconCheck, IconClock, IconFlag, IconHourglass, IconKeyboard, IconRotateClockwise, IconStar, IconStarFilled, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { DomainChip } from '../components/common/DomainChip';
import { Explanation } from '../components/common/Explanation';
import { ChoiceList } from '../components/quiz/ChoiceList';
import { DataTableView } from '../components/quiz/DataTableView';
import { MatchBoard } from '../components/quiz/MatchBoard';
import { SessionTrack } from '../components/quiz/SessionTrack';
import { domainOf } from '../domain/blueprint';
import { requiredSelections } from '../domain/scoring';
import type { Answer } from '../domain/types';
import { useHotkeys } from '../hooks/useHotkeys';
import { useNow } from '../hooks/useNow';
import { formatClock } from '../lib/format';
import { favoriteKey, type AnswerResult, type QuizSession } from '../state/appState';
import { useApp } from '../state/AppContext';
import styles from './screens.module.css';

const TYPE_LABEL = { single_choice: 'Single answer', multiple_choice: 'Multiple select', drag_and_drop: 'Drag & drop' } as const;

export function QuizScreen() {
  const { state, dispatch } = useApp();
  const s = state.session as QuizSession;
  const now = useNow(1000, !s.finishedAt);
  const answered = s.results.filter(Boolean).length;
  const isMock = s.mode === 'mock';
  const remaining = s.deadline ? Math.max(0, (s.deadline - now) / 1000) : null;

  const finish = () => dispatch({ type: 'session/finished', now: Date.now() });
  const goTo = (i: number) => dispatch({ type: 'session/moved', index: Math.max(0, Math.min(s.items.length - 1, i)) });
  const exit = () => {
    if (isMock && answered && !confirm('Leave the mock exam? Your answers so far are saved to history.')) return;
    dispatch({ type: 'session/abandoned', now: Date.now() });
  };
  const submitExam = () => {
    const open = s.items.length - answered;
    if (open && !confirm(`${open} question${open === 1 ? ' is' : 's are'} unanswered and will count as wrong. Submit the exam?`)) return;
    finish();
  };

  // Time's up: submit the mock exam automatically.
  useEffect(() => {
    if (remaining === 0 && !s.finishedAt) dispatch({ type: 'session/finished', now: Date.now() });
  }, [remaining, s.finishedAt, dispatch]);

  useHotkeys((e) => {
    if (e.key === 'ArrowRight') goTo(s.index + 1);
    else if (e.key === 'ArrowLeft') goTo(s.index - 1);
    else if (e.key === 'Escape') exit();
  });

  return (
    <div className={styles.quiz}>
      <header className={styles.quizBar}>
        <button className="btn btn-ghost btn-sm" onClick={exit} title="Leave session (Esc)">
          <IconX size={16} /> Exit
        </button>
        <div className={styles.quizTitle}>
          <span className="eyebrow">{s.title}</span>
          <span className={styles.counter}>
            {s.index + 1}
            <span>/{s.items.length}</span>
          </span>
        </div>
        <span className={`${styles.timer} ${remaining !== null && remaining < 300 ? styles.timerLow : ''}`} title={remaining !== null ? 'Time remaining' : 'Time in session'}>
          {remaining !== null ? <IconHourglass size={15} /> : <IconClock size={15} />}
          {formatClock(remaining ?? (now - s.startedAt) / 1000)}
        </span>
      </header>

      <SessionTrack session={s} onJump={goTo} />

      <QuestionPane key={`${s.startedAt}-${s.index}`} session={s} />

      <footer className={styles.quizFoot}>
        <button className="btn btn-ghost btn-sm" onClick={() => goTo(s.index - 1)} disabled={s.index === 0}>
          <IconArrowLeft size={15} /> Previous
        </button>
        <span className={styles.kbdHint}>
          <IconKeyboard size={14} /> A–E select · Enter submit/next · ←/→ move · F star · Esc exit
        </span>
        {isMock ? (
          <button className="btn btn-sm" onClick={submitExam}>
            <IconFlag size={15} /> Submit exam ({answered}/{s.items.length})
          </button>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => goTo(s.index + 1)} disabled={s.index === s.items.length - 1}>
            Skip <IconArrowRight size={15} />
          </button>
        )}
      </footer>
    </div>
  );
}

function initialAnswer(result: AnswerResult | undefined) {
  return {
    selected: result?.answer.kind === 'choice' ? result.answer.selected : [],
    mapping: result?.answer.kind === 'match' ? result.answer.mapping : {},
  };
}

/** One question. Keyed by index, so local selection state resets when the question changes. */
function QuestionPane({ session: s }: { session: QuizSession }) {
  const { state, answer, dispatch, toggleFavorite } = useApp();
  const { examId, q } = s.items[s.index];
  const result = s.results[s.index];
  const [selected, setSelected] = useState<string[]>(() => initialAnswer(result).selected);
  const [mapping, setMapping] = useState<Record<string, string>>(() => initialAnswer(result).mapping);

  const locked = Boolean(result);
  const reveal = s.reveal && locked;
  const need = requiredSelections(q);
  const isLast = s.index === s.items.length - 1;
  const starred = Boolean(state.favorites[favoriteKey(examId, q.id)]);
  const examTitle = state.exams[examId]?.meta.title;
  const crossExam = !s.examId;

  const canSubmit = q.type === 'drag_and_drop' ? (q.targets ?? []).every((t) => mapping[t.id]) : selected.length === need;

  function toggle(id: string) {
    if (locked) return;
    if (q.type === 'single_choice') return setSelected([id]);
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-need)));
  }

  function next() {
    if (isLast) dispatch({ type: 'session/finished', now: Date.now() });
    else dispatch({ type: 'session/moved', index: s.index + 1 });
  }

  function submit() {
    if (!canSubmit || locked) return;
    const a: Answer = q.type === 'drag_and_drop' ? { kind: 'match', mapping } : { kind: 'choice', selected };
    answer(a);
    if (!s.reveal) {
      // Mock exam: move to the next unanswered question; finish only when none are left.
      const open = (from: number) => s.results.findIndex((r, i) => !r && i !== s.index && i >= from);
      const target = open(s.index + 1) >= 0 ? open(s.index + 1) : open(0);
      if (target >= 0) dispatch({ type: 'session/moved', index: target });
      else dispatch({ type: 'session/finished', now: Date.now() });
    }
  }

  useHotkeys((e) => {
    const k = e.key.toLowerCase();
    if (k === 'enter') {
      e.preventDefault();
      if (!locked) submit();
      else next();
    } else if (k === 'f') {
      toggleFavorite(examId, q);
    } else if (q.choices && !locked) {
      const idx = /^[1-9]$/.test(k) ? Number(k) - 1 : /^[a-z]$/.test(k) ? k.charCodeAt(0) - 97 : -1;
      const choice = q.choices[idx];
      if (choice) toggle(choice.id);
    }
  });

  return (
    <article className={`card ${styles.qCard}`}>
      <div className={styles.qMeta}>
        <DomainChip domain={domainOf(q)} />
        <span className={styles.qType}>
          {TYPE_LABEL[q.type]}
          {q.type === 'multiple_choice' && ` · choose ${need}`}
        </span>
        <span className={styles.qId}>
          {crossExam && examTitle ? `${examTitle} · ` : ''}Q{q.id}
        </span>
        <button
          className={`btn btn-ghost btn-sm btn-icon ${starred ? styles.starred : ''}`}
          onClick={() => toggleFavorite(examId, q)}
          aria-pressed={starred}
          aria-label={starred ? 'Remove from favorites (F)' : 'Add to favorites (F)'}
          title="Favorite (F)"
        >
          {starred ? <IconStarFilled size={17} /> : <IconStar size={17} />}
        </button>
      </div>

      <h2 className={styles.qText2}>{q.question}</h2>
      {q.data_table && <DataTableView table={q.data_table} />}
      {q.note && <p className={styles.qNote}>{q.note}</p>}

      {q.type === 'drag_and_drop' ? (
        <MatchBoard q={q} mapping={mapping} onChange={setMapping} locked={locked} reveal={reveal} />
      ) : (
        <ChoiceList q={q} selected={selected} onToggle={toggle} locked={locked} reveal={reveal} />
      )}

      {reveal && result && (
        <div className={`${styles.feedback} ${result.correct ? styles.fbOk : styles.fbBad}`} role="status">
          <div className={styles.fbHead}>
            {result.correct ? <IconCheck size={20} /> : <IconX size={20} />}
            <strong>{result.correct ? 'Correct' : 'Not quite'}</strong>
          </div>
          <Explanation text={q.explanation} />
        </div>
      )}
      {locked && !s.reveal && <p className={styles.savedNote}>Answer saved. You'll see results when you submit the exam.</p>}

      <div className={styles.qActions}>
        {!locked && (
          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
            {s.reveal ? (
              <>
                <IconCheck size={17} /> Check answer
              </>
            ) : (
              <>
                Save &amp; next <IconArrowRight size={17} />
              </>
            )}
          </button>
        )}
        {!locked && !canSubmit && (
          <span className={styles.hint}>
            {q.type === 'drag_and_drop' ? 'Fill every target' : `Select ${need - selected.length} more`}
          </span>
        )}
        {locked && s.reveal && (
          <>
            <button className="btn btn-primary" onClick={next} autoFocus>
              {isLast ? (
                <>
                  <IconFlag size={17} /> Finish
                </>
              ) : (
                <>
                  Next <IconArrowRight size={17} />
                </>
              )}
            </button>
            <button className="btn btn-sm" onClick={() => dispatch({ type: 'session/undone' })} title="Undo this answer and try again">
              <IconRotateClockwise size={15} /> Try again
            </button>
          </>
        )}
      </div>
    </article>
  );
}
