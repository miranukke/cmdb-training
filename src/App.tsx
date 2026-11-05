import { AppHeader } from './components/layout/AppHeader';
import { Toast } from './components/layout/Toast';
import { ExamScreen } from './screens/ExamScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { AppProvider, useApp } from './state/AppContext';
import styles from './App.module.css';

function Screen() {
  const { state } = useApp();
  const { view, session } = state;
  switch (view.name) {
    case 'exam':
      return <ExamScreen examId={view.examId} />;
    case 'quiz':
      return session ? <QuizScreen /> : <HomeScreen tab="overview" />;
    case 'results':
      return session ? <ResultsScreen /> : <HomeScreen tab="overview" />;
    case 'home':
      return <HomeScreen tab={view.tab} />;
  }
}

function Shell() {
  const { state } = useApp();
  const focusMode = state.view.name === 'quiz';
  return (
    <div className={styles.app}>
      {!focusMode && <AppHeader />}
      <main>
        <Screen />
      </main>
      {!focusMode && (
        <footer className={styles.footer}>
          Answer keys checked against ServiceNow product docs and ServiceNow University training. Not affiliated with ServiceNow.
        </footer>
      )}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
