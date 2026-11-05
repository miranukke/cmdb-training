import { IconAlertTriangle, IconDeviceDesktop, IconMoon, IconRefresh, IconSun } from '@tabler/icons-react';
import { useTheme } from '../../hooks/useTheme';
import { useApp } from '../../state/AppContext';
import styles from './layout.module.css';

/** Three linked CIs, the logo mark. */
function LogoMark() {
  return (
    <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden className={styles.logo}>
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" className={styles.logoBg} />
      <path d="M12 27 L20 13 L28 27 Z" className={styles.logoEdges} />
      <circle cx="20" cy="13" r="4" style={{ fill: 'var(--d-govern)' }} />
      <circle cx="12" cy="27" r="4" style={{ fill: 'var(--d-configuration)' }} />
      <circle cx="28" cy="27" r="4" style={{ fill: 'var(--d-insight)' }} />
    </svg>
  );
}

export function AppHeader() {
  const { state, refreshExams, navigate } = useApp();
  const { theme, cycle } = useTheme();
  const ThemeIcon = theme === 'light' ? IconSun : theme === 'dark' ? IconMoon : IconDeviceDesktop;
  const loading = state.sync.status === 'loading';

  return (
    <header className={styles.header}>
      <button type="button" className={styles.brand} onClick={() => navigate({ name: 'home', tab: 'overview' })}>
        <LogoMark />
        <span>
          <span className={styles.title}>CIS-DF Trainer</span>
          <span className={styles.subtitle}>Data Foundations · CMDB &amp; CSDM</span>
        </span>
      </button>
      <div className={styles.actions}>
        <span className={`${styles.sync} ${styles[state.sync.status]}`} title={state.sync.message} role="status">
          {state.sync.status === 'error' ? <IconAlertTriangle size={14} /> : <i aria-hidden />}
          <span className={styles.syncText}>{state.sync.message ?? 'Ready'}</span>
        </span>
        <button className="btn btn-ghost btn-icon" onClick={() => void refreshExams()} disabled={loading} title="Reload exams" aria-label="Reload exams">
          <IconRefresh size={18} className={loading ? styles.spin : undefined} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={cycle} title={`Theme: ${theme} (click to change)`} aria-label={`Theme: ${theme}`}>
          <ThemeIcon size={18} />
        </button>
      </div>
    </header>
  );
}
