import { IconBooks, IconHistory, IconLayoutDashboard, IconStar } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { HomeTab } from '../../state/appState';
import { useApp } from '../../state/AppContext';
import { ExamsTab } from './ExamsTab';
import { FavoritesTab } from './FavoritesTab';
import { HistoryTab } from './HistoryTab';
import { OverviewTab } from './OverviewTab';
import styles from './home.module.css';

const TABS: { key: HomeTab; label: string; icon: ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <IconLayoutDashboard size={17} /> },
  { key: 'exams', label: 'Exams', icon: <IconBooks size={17} /> },
  { key: 'favorites', label: 'Favorites', icon: <IconStar size={17} /> },
  { key: 'history', label: 'History', icon: <IconHistory size={17} /> },
];

export function HomeScreen({ tab }: { tab: HomeTab }) {
  const { state, navigate } = useApp();
  const favCount = Object.keys(state.favorites).length;
  const examCount = Object.keys(state.exams).length;

  return (
    <>
      <nav className={styles.tabs} role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? styles.tabActive : undefined}
            onClick={() => navigate({ name: 'home', tab: t.key })}
          >
            {t.icon}
            {t.label}
            {t.key === 'favorites' && favCount > 0 && <span className={styles.tabCount}>{favCount}</span>}
            {t.key === 'exams' && examCount > 0 && <span className={styles.tabCount}>{examCount}</span>}
          </button>
        ))}
      </nav>
      <div role="tabpanel">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'exams' && <ExamsTab />}
        {tab === 'favorites' && <FavoritesTab />}
        {tab === 'history' && <HistoryTab />}
      </div>
    </>
  );
}
